# ── Base Image ─────────────────────────────────────────
FROM node:20-alpine

# ── Working Directory ──────────────────────────────────
WORKDIR /app

# ── Install Dependencies ───────────────────────────────
COPY package*.json ./
RUN npm install

# ── Copy Source Code ───────────────────────────────────
COPY . .

# ── Expose Port ────────────────────────────────────────
EXPOSE 3000

# ── Start Command ──────────────────────────────────────
CMD ["node", "./bin/www"]