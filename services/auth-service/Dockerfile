FROM node:20-alpine
WORKDIR /app
COPY services/auth-service/package*.json ./
RUN npm ci --omit=dev
COPY shared/ ./shared/
COPY services/auth-service/src/ ./src/
EXPOSE 4001
USER node
CMD ["node", "src/server.js"]
