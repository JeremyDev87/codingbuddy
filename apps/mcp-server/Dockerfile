# Build Stage
FROM node:24-alpine AS builder
WORKDIR /app

# Copy package files
COPY mcp-server/package*.json ./mcp-server/
WORKDIR /app/mcp-server
RUN npm ci

# Copy source code
COPY mcp-server/ .
RUN npm run build

# Production Stage
FROM node:24-alpine
WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/mcp-server/dist ./dist
COPY --from=builder /app/mcp-server/package*.json ./
RUN npm ci --only=production

# Copy rules directory (Crucial: Context must be repo root)
COPY .ai-rules ../.ai-rules

# Environment setup
ENV NODE_ENV=production
ENV MCP_TRANSPORT=sse
ENV PORT=3000

EXPOSE 3000
CMD ["node", "dist/main.js"]
