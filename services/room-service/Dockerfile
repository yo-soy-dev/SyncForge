FROM node:20-alpine
WORKDIR /app
COPY services/room-service/package*.json ./
RUN npm ci --omit=dev
COPY shared/ ./shared/
COPY services/room-service/src/ ./src/
EXPOSE 4002
USER node
CMD ["node", "src/server.js"]
