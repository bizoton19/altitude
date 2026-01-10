# Firebase Configuration Guide

This guide will help you set up Firebase Authentication for the Altitude platform.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard:
   - Enter project name (e.g., "Altitude")
   - Enable/disable Google Analytics (optional)
   - Click "Create project"

## Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Click **Email/Password**
3. Enable "Email/Password" provider
4. Click **Save**

## Step 3: Get Frontend Configuration

1. In Firebase Console, click the gear icon ⚙️ > **Project settings**
2. Scroll down to **Your apps** section
3. Click the **Web** icon (`</>`) to add a web app
4. Register your app:
   - App nickname: "Altitude Frontend"
   - Check "Also set up Firebase Hosting" (optional)
   - Click **Register app**
5. Copy the `firebaseConfig` object values

## Step 4: Configure Frontend

### Option A: Using Environment Variables (Recommended)

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your Firebase config:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
   ```

3. Restart your dev server for changes to take effect

### Option B: Using firebase-config.js

1. Copy `firebase-config.js.example` to `firebase-config.js`:
   ```bash
   cp firebase-config.js.example firebase-config.js
   ```

2. Edit `firebase-config.js` and fill in your Firebase config

3. Update `src/services/auth.js` to import from `firebase-config.js` instead of environment variables

## Step 5: Configure Backend (Firebase Admin SDK)

1. In Firebase Console, go to **Project settings** > **Service accounts**
2. Click **Generate new private key**
3. Download the JSON file (e.g., `altitude-firebase-adminsdk-xxxxx.json`)
4. Save it as `backend/firebase-service-account.json`
5. Update `.env` with the path:
   ```env
   FIREBASE_SERVICE_ACCOUNT_KEY_PATH=backend/firebase-service-account.json
   ```

   Or set the environment variable:
   ```bash
   export FIREBASE_SERVICE_ACCOUNT_KEY_PATH=backend/firebase-service-account.json
   ```

## Step 6: Test Authentication

1. Start the backend:
   ```bash
   cd backend
   python run.py
   ```

2. Start the frontend:
   ```bash
   npm run dev
   ```

3. Navigate to the app and try signing up/logging in

## Troubleshooting

### "Firebase not initialized" error
- Check that all environment variables are set correctly
- Make sure `.env` file is in the project root
- Restart the dev server after changing `.env`

### "Invalid authentication token" error
- Verify Firebase Admin SDK is configured correctly
- Check that `firebase-service-account.json` path is correct
- Ensure the service account has proper permissions

### CORS errors
- Make sure Firebase Auth domain is added to authorized domains in Firebase Console
- Check that backend CORS settings allow your frontend origin

## Security Notes

- **Never commit** `.env` or `firebase-service-account.json` to git
- These files are already in `.gitignore`
- Keep your Firebase API keys secure
- Rotate keys if they're accidentally exposed

## Next Steps

After Firebase is configured:
1. Create test users via the login page
2. Assign roles via the backend API (admin only):
   ```bash
   curl -X PATCH http://localhost:8000/api/auth/users/{user_id}/role \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"role": "admin"}'
   ```
3. Test investigation creation and review queue features
















