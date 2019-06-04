FROM node:12.3.1-stretch-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . /app
CMD ["npm","start"]