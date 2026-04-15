# production stage
FROM node:20-slim as production-stage
WORKDIR /app
COPY .output ./
EXPOSE 80
ENV PORT=80
CMD ["node", "server/index.mjs"]
