FROM node:20-alpine
WORKDIR /app
COPY services/ai-service/package*.json ./
RUN npm ci --omit=dev
COPY shared/ ./shared/
COPY services/ai-service/src/ ./src/
EXPOSE 4004
USER node
CMD ["node", "src/server.js"]
