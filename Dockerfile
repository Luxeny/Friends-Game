FROM node:22-slim

WORKDIR /app

ARG CACHEBUST=5

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build && npm run build:server

RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

EXPOSE 8080

ENTRYPOINT ["./start.sh"]
