FROM node:20-alpine
WORKDIR /app
COPY services/collaboration-service/package*.json ./
RUN npm ci --omit=dev
COPY shared/ ./shared/
COPY services/collaboration-service/src/ ./src/
EXPOSE 4003
USER node
CMD ["node", "src/server.js"]
