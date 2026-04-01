#!/bin/bash
set -e
cd "$(dirname "$0")/.."
echo "Starting SGEI with Docker Compose..."

# Build then run (compatible with older versions)
docker-compose build
docker-compose up -d

echo ""
echo "==================================="
echo "✅ SGEI is running!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo "   API Docs: http://localhost:3001/api/docs"
echo ""
echo "   Login: admin@sgei.pt / Admin@1234"
echo "==================================="