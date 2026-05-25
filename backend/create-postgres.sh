#!/bin/bash
set -e

CONTAINER_NAME="bpmn-postgres"

# Check if a container with this name exists (running or stopped)
if [ "$(docker ps -aq -f name=^/${CONTAINER_NAME}$)" ]; then
    echo "Container '${CONTAINER_NAME}' already exists."

    # Check if it's currently running
    if [ "$(docker ps -q -f name=^/${CONTAINER_NAME}$)" ]; then
        echo "⚡ Container is already running on port 5432!"
    else
        echo "🔄 Container is stopped. Starting it up without losing your data..."
        docker start ${CONTAINER_NAME}
        echo "🚀 Container started!"
    fi
else
    # Container doesn't exist at all, create it fresh
    echo "🐳 Creating and starting a brand new pgvector PostgreSQL container..."
    docker run -d \
      --name "$CONTAINER_NAME" \
      -p 5432:5432 \
      -e POSTGRES_DB=bpmn_db \
      -e POSTGRES_USER=engine_user \
      -e POSTGRES_PASSWORD=mysecretpassword \
      -v pgdata:/var/lib/postgresql/data \
      --restart always \
      pgvector/pgvector:pg16

    echo "🎉 Container '${CONTAINER_NAME}' created and started successfully!"
fi