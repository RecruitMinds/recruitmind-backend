#######################
# DEVELOPMENT STAGE
#######################
FROM node:22-alpine AS development

# Set working directory
WORKDIR /usr/src/app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# Copy application source
COPY . .

# Switch to non-root user for better security
USER node


#######################
# BUILD STAGE
#######################
FROM node:22-alpine AS build

# Set working directory
WORKDIR /usr/src/app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Reuse node_modules from development stage
COPY --from=development /usr/src/app/node_modules ./node_modules

# Copy application source
COPY . .

# Build application
RUN pnpm run build

# Prepare production dependencies
ENV NODE_ENV=production
RUN pnpm install --prod

# Switch to non-root user for better security
USER node


#######################
# PRODUCTION STAGE
#######################
FROM node:22-alpine AS production

# Set working directory
WORKDIR /usr/src/app

# Copy only production dependencies and built application
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist

# Start the application
CMD ["node", "dist/main.js"]