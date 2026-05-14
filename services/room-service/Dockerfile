FROM node:20-alpine
WORKDIR /app
COPY services/room-service/package*.json ./
RUN npm install
COPY shared/ ./shared/
COPY services/room-service/src/ ./src/
EXPOSE 4002
CMD ["node", "src/server.js"]
