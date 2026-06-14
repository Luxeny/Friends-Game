FROM node:22-slim

WORKDIR /app

ARG CACHEBUST=8

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build && npm run build:server

RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=90s --retries=10 \
  CMD ["node", "healthcheck.cjs"]

ENTRYPOINT ["./start.sh"]
