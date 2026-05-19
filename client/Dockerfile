FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_API_URL=http://localhost:3000
ARG VITE_SOCKET_URL=http://localhost:4003

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

RUN npm run build

# FROM node:20-alpine

# WORKDIR /app
# COPY package*.json ./
# RUN npm install
# COPY . .

# EXPOSE 5173
# CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]



FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]