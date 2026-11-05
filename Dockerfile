FROM node:22-slim

WORKDIR /app

# Copy package manifests and install all dependencies (including build tools)
COPY package.json package-lock.json* ./
RUN npm install --include=dev

# Copy application source
COPY . .

# Build the frontend bundle into dist/
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "start"]
