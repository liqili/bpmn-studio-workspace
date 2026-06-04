# --- Stage 1: Build the React Application ---
FROM node:14-alpine AS build

WORKDIR /app

# Copy package files first to leverage Docker's caching mechanism
COPY package*.json ./

# Install dependencies (using --legacy-peer-deps just in case of version mismatches)
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the production-ready static files
RUN npm run build

# --- Stage 2: Serve with Nginx ---
FROM nginx:1.31.1-alpine-slim

# Copy the static build files from Stage 1 into Nginx's public folder
COPY --from=build /app/build /usr/share/nginx/html

# Expose port 80 for traffic
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]