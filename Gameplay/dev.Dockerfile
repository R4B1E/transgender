FROM node:22-alpine

WORKDIR /build

COPY package*.json ./

RUN npm install

COPY . ./

CMD ["npm", "run", "dev"]