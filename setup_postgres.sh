#!/bin/bash

echo "🚀 Setting up PostgreSQL for Altitude..."

# Start PostgreSQL container
echo "📦 Starting PostgreSQL container..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker-compose exec -T postgres pg_isready -U altitude > /dev/null 2>&1; do
  echo "   Waiting for PostgreSQL..."
  sleep 2
done

echo "✅ PostgreSQL is ready!"

# Install asyncpg if not already installed
echo "📥 Installing asyncpg driver..."
cd backend
if [ -d ".venv" ]; then
    source .venv/bin/activate
    pip install asyncpg>=0.29.0
else
    echo "⚠️  Virtual environment not found. Please activate it and run: pip install asyncpg>=0.29.0"
fi
cd ..

echo ""
echo "📝 Next steps:"
echo "1. Update your .env file with:"
echo "   DATABASE_URL=postgresql+asyncpg://altitude:altitude_dev@localhost:5432/altitude"
echo ""
echo "2. Restart your backend server to connect to PostgreSQL"
echo ""
echo "3. The database tables will be created automatically on first startup"
echo ""
echo "✨ Setup complete!"



