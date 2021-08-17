# Multistage build is weird at the moment because
# of postinstall script after "npm install"

FROM node:16 AS builder
WORKDIR /usr/src/app
COPY package*.json ./
COPY src/ src/
COPY tsconfig.json .
RUN npm install --quiet

FROM node:16
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY package*.json ./
COPY src/ src/
COPY tsconfig.json .
RUN ls -al
RUN npm install --quiet --production
COPY --from=builder /usr/src/app/dist/ dist/
USER node
EXPOSE 8080
ENTRYPOINT ["node", "dist/index.js"]