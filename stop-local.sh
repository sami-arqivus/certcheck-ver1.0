#!/bin/bash

# CertCheck Local Development Stop Script

echo "🛑 Stopping CertCheck Local Development..."

# Stop Docker services
echo "🐳 Stopping Docker services..."
docker-compose down

# Kill SSH tunnel
echo "🔗 Stopping SSH tunnel..."
pkill -f "ssh.*6379.*ec2-54-159-160-253"

echo "✅ Local development environment stopped!"
