# Chromium + its system libraries must be inside the image: Render's native runtime cannot
# install them, which is what "Executable doesn't exist at …/ms-playwright/…" means.
FROM node:22-bookworm-slim

WORKDIR /app

# Dependencies first, so the browser layer is cached while the app changes.
COPY package.json package-lock.json ./
RUN npm ci

# Installs into /root/.cache/ms-playwright inside the image, with the apt packages it needs.
RUN npx playwright install --with-deps chromium

COPY . .

# Chromium runs as root in the container: it needs --no-sandbox (see src/web/server.ts).
ENV NODE_ENV=production PW_NO_SANDBOX=1 PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
