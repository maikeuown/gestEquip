#!/bin/bash
set -e

echo "=== SGEI - Dev Setup ==="

# Start PostgreSQL with Docker
echo "Starting PostgreSQL..."
docker run -d --name gestequip-db \
  -e POSTGRES_DB=gestequip \
  -e POSTGRES_USER=gestequip \
  -e POSTGRES_PASSWORD=gestequip \
  -p 5432:5432 \
  postgres:16-alpine 2>/dev/null || echo "DB container already running"

echo "Waiting for DB..."
sleep 3

# Backend setup
echo "Installing backend dependencies..."
cd "$(dirname "$0")/../backend"
npm install

echo "Running Prisma migrations..."
npx prisma migrate dev --name init 2>/dev/null || npx prisma db push
npx prisma generate

echo "Seeding database..."
npx ts-node prisma/seed.ts 2>/dev/null || true

echo "Starting backend in background..."
npm run start:dev &
BACKEND_PID=$!

# Frontend setup
echo "Installing frontend dependencies..."
cd "../frontend"
npm install

echo "Starting frontend..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "==================================="
echo "✅ SGEI is running!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo "   API Docs: http://localhost:3001/api/docs"
echo ""
echo "   Login: admin@sgei.pt / Admin@1234"
echo "==================================="

wait $FRONTEND_PID
