# Candidate-side H5 + mock API in one image (demo / acceptance use).
# Base image is MIT/BSD-licensed runtime. No GPL dependencies.
FROM node:22-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY . .

# Build the static H5
RUN npm run build

ENV PORT=3001
EXPOSE 3001 4173

# Serve mock API on 3001 and built H5 on 4173 via a tiny node launcher
CMD ["node", "server.js"]
