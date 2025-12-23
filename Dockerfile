FROM node:18-slim

# Install Playwright dependencies
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

# Install Xvfb for virtual display (for headed mode on servers)
RUN apt-get update && apt-get install -y xvfb && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Install Playwright browsers
RUN npx playwright install chromium --with-deps

# Copy application files
COPY . .

# Expose port
EXPOSE 3000

# Start script that runs Xvfb and then the app
CMD ["sh", "-c", "Xvfb :99 -screen 0 1920x1080x24 > /dev/null 2>&1 & export DISPLAY=:99 && node server.js"]

