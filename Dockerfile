FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY db.json ./
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["sh", "-c", "cp /app/db.json /data/db.json && npm start"]
