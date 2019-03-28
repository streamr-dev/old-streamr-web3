# Use official node runtime as base image
FROM node:10-alpine

# Set the working directory to /app
WORKDIR /app

# Copy app code
COPY . /app

# Install package.json dependencies (yes, clean up must be part of same RUN command because of layering)
RUN apk add --update git && npm install && apk del git && rm -rf /var/cache/apk/*

# Make port 3001 available to the world outside this container
EXPOSE 3001

# Default environment variables
ENV ETHEREUM_SERVER_URL https://rinkeby.infura.io/
ENV PORT 3001

CMD npm run start
