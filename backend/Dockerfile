FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# Expose the API port
EXPOSE 3000

# We use the dev script to run nodemon or just start
CMD ["npm", "start"]
