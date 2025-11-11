# Use Node 22 as base image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy the rest of the source code
COPY . .

# Expose the app port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
