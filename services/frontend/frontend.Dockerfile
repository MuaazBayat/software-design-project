# Define the builder stage
FROM node:18-alpine AS builder
# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Cppy all the files
COPY components ./components
COPY . .

# Pass secrets as build args
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG CLERK_SECRET_KEY
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_KEY
ARG NEXT_PUBLIC_FRONTEND_URL
ARG NEXT_PUBLIC_CORE_URL
ARG NEXT_PUBLIC_MATCHMAKING_URL
ARG NEXT_PUBLIC_MESSAGING_URL
ARG NEXT_PUBLIC_MODERATION_URL

RUN echo "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" > .env \
 && echo "CLERK_SECRET_KEY=$CLERK_SECRET_KEY" >> .env \
 && echo "NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL" >> .env \
 && echo "NEXT_PUBLIC_SUPABASE_KEY=$NEXT_PUBLIC_SUPABASE_KEY" >> .env \
 && echo "NEXT_PUBLIC_FRONTEND_URL=$NEXT_PUBLIC_FRONTEND_URL" >> .env \
 && echo "NEXT_PUBLIC_CORE_URL=$NEXT_PUBLIC_CORE_URL" >> .env \
 && echo "NEXT_PUBLIC_MATCHMAKING_URL=$NEXT_PUBLIC_MATCHMAKING_URL" >> .env \
 && echo "NEXT_PUBLIC_MESSAGING_URL=$NEXT_PUBLIC_MESSAGING_URL" >> .env \
 && echo "NEXT_PUBLIC_MODERATION_URL=$NEXT_PUBLIC_MODERATION_URL" >> .env

# Build the Next.js app
RUN npm run build

# Use the official Node.js 18 image for the production stage
FROM node:18-alpine AS production

# Set the working directory
WORKDIR /app

# Copy the built files from the builder stage
COPY --from=builder /app ./

# Install only production dependencies
RUN npm install

# Expose the port the app runs on
EXPOSE 3000

# Start the Next.js app
CMD ["npm", "start"]