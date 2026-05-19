FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache \
    python3 \
    py3-pip \
    openjdk17-jre \
    g++ \
    go

COPY services/code-execution-service/package*.json ./
RUN npm install
RUN npm install -g ts-node typescript

COPY shared/ ./shared/
COPY services/code-execution-service/src/ ./src/

EXPOSE 4005

CMD ["node", "src/server.js"]