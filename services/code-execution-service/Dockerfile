# FROM node:20-alpine

# WORKDIR /app

# RUN apk add --no-cache python3

# COPY services/code-execution-service/package*.json ./
# RUN npm install
# RUN npm install -g ts-node typescript

# COPY shared/ ./shared/
# COPY services/code-execution-service/src/ ./src/

# RUN adduser -D -u 10001 sandbox
# ENV SANDBOX_UID=10001 SANDBOX_GID=10001 ENABLED_LANGUAGES=javascript,python,typescript

# EXPOSE 4005

# CMD ["node", "src/server.js"]










FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    default-jdk-headless \
    g++ \
    golang-go \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY services/code-execution-service/package*.json ./

RUN npm install --omit=dev
RUN npm install -g typescript @types/node@20

COPY shared/ ./shared/
COPY services/code-execution-service/src/ ./src/

RUN useradd --uid 10001 --no-create-home --shell /usr/sbin/nologin sandbox

ENV NODE_ENV=production
ENV SANDBOX_UID=10001
ENV SANDBOX_GID=10001
ENV ENABLED_LANGUAGES=javascript,python,typescript,java,cpp,go

EXPOSE 4005

CMD ["node", "src/server.js"]