# Use a Node version compatible with Vite 7 / modern ESLint packages
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose the application port
EXPOSE 5174

# Start the application using Vite's development server
CMD ["npm", "run", "dev"]
