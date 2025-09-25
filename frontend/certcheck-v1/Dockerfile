# Use official Node.js image
# FROM node:20-slim

# # Set working directory
# WORKDIR /app

# # Copy package files and install dependencies first
# COPY package*.json ./
# RUN npm install                         
# RUN npm install -g serve
# # Copy the rest of the app
# COPY . .

# # Expose dev server port (usually 3000)
# EXPOSE 8080

# # Start dev server
# CMD ["npm", "run", "dev"]



# --legacy-peer-deps




FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build
RUN npm install -g serve

EXPOSE 8080
CMD ["serve", "-s", "dist", "-l", "8080"]