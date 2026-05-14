FROM node:20-alpine
WORKDIR /app
COPY services/collaboration-service/package*.json ./
RUN npm install
COPY shared/ ./shared/
COPY services/collaboration-service/src/ ./src/
EXPOSE 4003
CMD ["node", "src/server.js"]
