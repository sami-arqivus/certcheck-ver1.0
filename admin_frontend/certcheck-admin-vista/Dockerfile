FROM node:18-alpine

# Set working directory
WORKDIR /admin-frontend

# Copy package files and install dependencies first
COPY package*.json ./
RUN npm install

# Copy the rest of the app
COPY . .

# Expose dev server port (usually 3000)
EXPOSE 8081

# Start dev server
CMD ["npm", "run", "dev"]