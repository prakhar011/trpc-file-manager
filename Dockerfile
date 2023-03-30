# Use an official Node runtime as a parent image
FROM node:18-alpine3.16

# Set the working directory to /app
WORKDIR /app

# Copy the package.json and yarn.lock files to the container
COPY prisma ./prisma/
COPY ["package.json", "yarn.lock", "tsconfig.json", ".env", "./"]

# Install dependencies using Yarn
RUN yarn

# Copy the rest of the application code to the container
COPY . .

# Compile TypeScript code
RUN yarn build

# Expose port 8000 to the outside world
EXPOSE 8000

# Start the application

CMD ["yarn", "start"]
