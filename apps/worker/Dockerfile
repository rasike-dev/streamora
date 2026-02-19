FROM node:20-bookworm

# ffmpeg + ffprobe
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && pnpm install --frozen-lockfile || pnpm install

COPY . .
CMD ["pnpm", "dev"]
