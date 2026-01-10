/**
 * Firebase Auth Service
 * Handles authentication using Firebase Auth SDK
 * Falls back to dev mode if Firebase is not configured
 */

let firebaseApp = null
let auth = null
let initialized = false
let devMode = false

// Firebase functions (loaded dynamically)
let initializeApp = null
let getAuth = null
let signInWithEmailAndPassword = null
let createUserWithEmailAndPassword = null
let firebaseSignOut = null
let onAuthStateChanged = null

export const initializeFirebase = async () => {
  if (initialized) return

  // Try to load Firebase modules dynamically
  // Construct paths dynamically to prevent Vite from statically analyzing these imports
  // This allows Firebase to be optional for local development
  try {
    // Build import paths dynamically so Vite can't statically analyze them
    const base = 'firebase'
    const appMod = 'app'
    const authMod = 'auth'
    const firebaseAppPath = `${base}/${appMod}`
    const firebaseAuthPath = `${base}/${authMod}`
    const firebaseModule = await import(/* @vite-ignore */ firebaseAppPath)
    const authModule = await import(/* @vite-ignore */ firebaseAuthPath)
    initializeApp = firebaseModule.initializeApp
    getAuth = authModule.getAuth
    signInWithEmailAndPassword = authModule.signInWithEmailAndPassword
    createUserWithEmailAndPassword = authModule.createUserWithEmailAndPassword
    firebaseSignOut = authModule.signOut
    onAuthStateChanged = authModule.onAuthStateChanged
  } catch (e) {
    // Firebase not installed or not available
    devMode = true
    initialized = true
    console.log('🔓 Dev mode: Authentication disabled (Firebase not available)')
    return
  }

  // Check if Firebase modules loaded successfully
  if (!initializeApp || !getAuth) {
    devMode = true
    initialized = true
    console.log('🔓 Dev mode: Authentication disabled (Firebase not configured)')
    return
  }

  try {
    // Load Firebase config from environment variables only
    // This allows Firebase auth to be optional when running locally
    // If no env vars are set, the app will run in dev mode (no authentication)
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    }

    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'your-api-key-here') {
      devMode = true
      initialized = true
      console.log('🔓 Dev mode: Authentication disabled (Firebase not configured)')
      console.log('📖 See FIREBASE_SETUP.md to enable authentication')
      return
    }

    firebaseApp = initializeApp(firebaseConfig)
    auth = getAuth(firebaseApp)
    initialized = true
    console.log('✅ Firebase initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error)
    devMode = true
    initialized = true
    console.log('🔓 Falling back to dev mode (no authentication)')
  }
}

export const isDevMode = () => devMode

export const signInWithEmail = async (email, password) => {
  if (!initialized) {
    await initializeFirebase()
  }
  
  if (devMode) {
    // Dev mode: create a mock user
    const mockUser = {
      uid: 'dev-user-' + Date.now(),
      email: email,
      displayName: email.split('@')[0],
    }
    localStorage.setItem('firebase_token', 'dev-token-' + Date.now())
    localStorage.setItem('firebase_user', JSON.stringify({
      uid: mockUser.uid,
      email: mockUser.email,
    }))
    console.log('🔓 Dev mode: Mock login successful')
    return mockUser
  }

  if (!auth) {
    throw new Error('Firebase not initialized. Please configure Firebase environment variables.')
  }

  const userCredential = await signInWithEmailAndPassword(auth, email, password)
  const token = await userCredential.user.getIdToken()
  
  // Store token
  localStorage.setItem('firebase_token', token)
  localStorage.setItem('firebase_user', JSON.stringify({
    uid: userCredential.user.uid,
    email: userCredential.user.email,
  }))

  return userCredential.user
}

export const signUpWithEmail = async (email, password) => {
  if (!initialized) {
    await initializeFirebase()
  }
  
  if (devMode) {
    // Dev mode: create a mock user
    const mockUser = {
      uid: 'dev-user-' + Date.now(),
      email: email,
      displayName: email.split('@')[0],
    }
    localStorage.setItem('firebase_token', 'dev-token-' + Date.now())
    localStorage.setItem('firebase_user', JSON.stringify({
      uid: mockUser.uid,
      email: mockUser.email,
    }))
    console.log('🔓 Dev mode: Mock signup successful')
    return mockUser
  }

  if (!auth) {
    throw new Error('Firebase not initialized. Please configure Firebase environment variables.')
  }

  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  const token = await userCredential.user.getIdToken()
  
  // Store token
  localStorage.setItem('firebase_token', token)
  localStorage.setItem('firebase_user', JSON.stringify({
    uid: userCredential.user.uid,
    email: userCredential.user.email,
  }))

  return userCredential.user
}

export const signOut = async () => {
  if (!initialized) {
    await initializeFirebase()
  }
  
  if (auth && firebaseSignOut) {
    await firebaseSignOut(auth)
  }
  
  localStorage.removeItem('firebase_token')
  localStorage.removeItem('firebase_user')
  console.log('🔓 Signed out')
}

export const getCurrentUser = () => {
  const userStr = localStorage.getItem('firebase_user')
  return userStr ? JSON.parse(userStr) : null
}

export const getAuthToken = () => {
  return localStorage.getItem('firebase_token')
}

export const isAuthenticated = () => {
  return !!getAuthToken()
}

export const refreshToken = async () => {
  if (!initialized) {
    await initializeFirebase()
  }
  
  if (devMode) {
    return localStorage.getItem('firebase_token')
  }
  
  if (!auth || !onAuthStateChanged) {
    return null
  }

  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken()
        localStorage.setItem('firebase_token', token)
        resolve(token)
      } else {
        resolve(null)
      }
    })
  })
}

