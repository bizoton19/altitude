#!/bin/bash

echo "🚀 Setting up Google Cloud SQL connection for Altitude..."

# Navigate to backend directory
cd "$(dirname "$0")"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp env.template .env
fi

# Add Cloud SQL configuration to .env
echo ""
echo "📝 Adding Cloud SQL configuration to .env..."

# Check if Cloud SQL config already exists
if grep -q "CLOUD_SQL_INSTANCE" .env; then
    echo "⚠️  Cloud SQL configuration already exists in .env"
    echo "   Please update it manually if needed."
else
    # Append Cloud SQL configuration template
    cat >> .env << 'EOF'

# Google Cloud SQL Configuration
# ⚠️ IMPORTANT: Replace these values with your actual Cloud SQL instance details
# DO NOT commit this file with real credentials to version control
CLOUD_SQL_INSTANCE=your-project-id:your-region:your-instance-id
CLOUD_SQL_DATABASE=altitude
CLOUD_SQL_USER=your_username
CLOUD_SQL_PASSWORD=your_password_here
CLOUD_SQL_USE_UNIX_SOCKET=true
EOF
    echo "✅ Cloud SQL configuration added to .env"
fi

echo ""
echo "📦 Installing/updating asyncpg driver..."
if [ -d "venv" ]; then
    source venv/bin/activate
    pip install -q asyncpg>=0.29.0
    echo "✅ asyncpg installed"
elif [ -d ".venv" ]; then
    source .venv/bin/activate
    pip install -q asyncpg>=0.29.0
    echo "✅ asyncpg installed"
else
    echo "⚠️  Virtual environment not found. Please activate it and run: pip install asyncpg>=0.29.0"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Verify the .env file has the correct Cloud SQL credentials"
echo "2. If running locally, you may need to use Cloud SQL Proxy:"
echo "   cloud_sql_proxy -instances=YOUR_PROJECT_ID:YOUR_REGION:YOUR_INSTANCE_ID=tcp:5432"
echo "3. If running on GCP, ensure the service account has Cloud SQL Client role"
echo "4. Start your backend server - the database schema will be created automatically"
echo ""

