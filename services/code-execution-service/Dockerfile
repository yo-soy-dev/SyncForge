FROM node:20-alpine

WORKDIR /app

# ── System languages install karo ───────────────
RUN apk add --no-cache \
    python3 \
    py3-pip \
    openjdk17-jre \
    g++ \
    go

# ── Node dependencies ────────────────────────────
COPY services/code-execution-service/package*.json ./
RUN npm install
RUN npm install -g ts-node typescript

# ── Source code ──────────────────────────────────
COPY shared/ ./shared/
COPY services/code-execution-service/src/ ./src/

EXPOSE 4004

CMD ["node", "src/server.js"]