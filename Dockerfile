FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build && npm run build:server

RUN chmod +x start.sh

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||8080)+'/health',(r)=>{r.resume();process.exit(r.statusCode>=200&&r.statusCode<300?0:1)}).on('error',()=>process.exit(1))"

ENTRYPOINT ["./start.sh"]
