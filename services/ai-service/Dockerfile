FROM node:20-alpine
WORKDIR /app
COPY services/ai-service/package*.json ./
RUN npm install
COPY shared/ ./shared/
COPY services/ai-service/src/ ./src/
EXPOSE 4004
CMD ["node", "src/server.js"]
