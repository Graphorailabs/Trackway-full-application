FROM node:20

# Set working directory
WORKDIR /usr/src/app

# Install dependencies
COPY package.json ./

RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Expose the port the app runs on
EXPOSE 4173

# Start the application
CMD ["npm", "run", "preview"]