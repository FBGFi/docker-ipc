ARG NODE_VERSION=18.0.0
FROM node:${NODE_VERSION}-alpine

ENV PORT=${PORT}

WORKDIR /usr/src/app

COPY . .

EXPOSE ${PORT}

CMD node index.js
