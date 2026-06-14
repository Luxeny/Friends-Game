FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build && npm run build:server

RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=120s --retries=12 \
  CMD ["node", "healthcheck.cjs"]

ENTRYPOINT ["./start.sh"]
