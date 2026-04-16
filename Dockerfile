FROM node:22-slim

RUN apt-get update && apt-get install -y python3 make g++ \
    libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm install tsx

COPY . .

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["npx", "tsx", "src/index.ts"]
