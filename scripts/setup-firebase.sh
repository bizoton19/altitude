#!/bin/bash

# Firebase Setup Script
# This script helps you set up Firebase configuration

echo "🔥 Firebase Setup for Altitude Platform"
echo "========================================"
echo ""

# Check if .env already exists
if [ -f .env ]; then
    echo "⚠️  .env file already exists. Backing up to .env.backup"
    cp .env .env.backup
fi

# Create .env from example
if [ ! -f .env.example ]; then
    echo "❌ .env.example not found. Creating it..."
    cat > .env.example << 'ENVEOF'
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=backend/firebase-service-account.json
ENVEOF
fi

cp .env.example .env

echo "✅ Created .env file from .env.example"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Go to https://console.firebase.google.com/"
echo "2. Create a new project or select existing one"
echo "3. Enable Authentication > Email/Password"
echo "4. Go to Project Settings > Your apps > Add Web app"
echo "5. Copy the firebaseConfig values"
echo ""
echo "6. Edit .env file and fill in your Firebase credentials:"
echo "   nano .env"
echo "   # or"
echo "   code .env"
echo ""
echo "7. For backend, download service account JSON:"
echo "   - Go to Project Settings > Service Accounts"
echo "   - Click 'Generate new private key'"
echo "   - Save as backend/firebase-service-account.json"
echo ""
echo "8. Restart your dev server after updating .env"
echo ""
echo "📖 See FIREBASE_SETUP.md for detailed instructions"
















