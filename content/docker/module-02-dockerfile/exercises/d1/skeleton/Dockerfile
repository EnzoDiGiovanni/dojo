FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm ci --omit=dev
ENV PORT=8080
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
