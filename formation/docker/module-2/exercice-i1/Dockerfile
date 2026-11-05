FROM node:22-alpine

ENV NODE_ENV=production

WORKDIR /srv/app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY . /srv/app

ENTRYPOINT ["node"]

CMD ["server.js"]

WORKDIR /srv/app

EXPOSE 3000
