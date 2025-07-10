# Multi-stage Dockerfile for VibeDoc Next.js Application
# Optimized for production deployment with minimal image size and enhanced security

# Stage 1: dependency-builder
# Install all dependencies including devDependencies
FROM node:18-alpine AS dependency-builder
RUN apk update && apk upgrade

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for build process)
RUN npm ci

# Stage 2: builder  
# Build the application for production
FROM node:18-alpine AS builder
RUN apk update && apk upgrade

# Set working directory
WORKDIR /app

# Copy dependencies from dependency-builder stage
COPY --from=dependency-builder /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build the Next.js application
RUN npm run build

# Stage 3: runner (Final Stage)
# Create minimal production image
FROM node:18-alpine AS runner
RUN apk update && apk upgrade

# Set to production environment
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set working directory
WORKDIR /app

# Copy package.json for runtime
COPY package.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to non-root user
USER nextjs

# Expose port 3000
EXPOSE 3000

# Set environment variables for Next.js
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]
