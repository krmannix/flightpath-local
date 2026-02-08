FROM node:20-alpine

WORKDIR /app

# install dependencies
COPY package*.json ./
RUN npm ci --only=production

# copy application
COPY . .

# health check
HEALTHCHECK --interval=60s --timeout=5s \
  CMD node -e "require('http').get('http://localhost:3000/api/status', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); });"

EXPOSE 3000

CMD ["node", "server.js"]
