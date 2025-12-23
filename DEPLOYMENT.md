# Deployment Guide

Quick hosting options for this project.

## 🚀 Option 1: Railway (Easiest - Recommended)

1. **Sign up**: Go to [railway.app](https://railway.app) and sign up with GitHub
2. **Create Project**: Click "New Project" → "Deploy from GitHub repo"
3. **Select Repo**: Choose your `webba` repository
4. **Deploy**: Railway auto-detects Node.js and deploys
5. **Set Environment Variable**: 
   - Go to Variables tab
   - Add: `HEADLESS=true`
6. **Get URL**: Railway provides a URL like `https://your-app.railway.app`

**Note**: Railway's free tier gives $5/month credit.

---

## 🚀 Option 2: Render

1. **Sign up**: Go to [render.com](https://render.com) and sign up
2. **New Web Service**: Click "New" → "Web Service"
3. **Connect Repo**: Connect your GitHub repository
4. **Configure**:
   - **Name**: `webba`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx playwright install chromium --with-deps`
   - **Start Command**: `node server.js`
5. **Environment Variables**:
   - Add: `HEADLESS=true`
6. **Deploy**: Click "Create Web Service"

**Note**: Free tier has 750 hours/month, spins down after 15 min inactivity.

---

## 🚀 Option 3: Fly.io

1. **Install Fly CLI**: `curl -L https://fly.io/install.sh | sh`
2. **Login**: `fly auth login`
3. **Launch**: `fly launch` (in project directory)
4. **Deploy**: `fly deploy`
5. **Set Environment**: `fly secrets set HEADLESS=true`

**Note**: Free tier available, good for Docker deployments.

---

## 🚀 Option 4: DigitalOcean Droplet (VPS)

1. **Create Droplet**: Ubuntu 22.04, $6/month
2. **SSH in**: `ssh root@your-droplet-ip`
3. **Install Node.js**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
4. **Install Xvfb** (for visible browser):
   ```bash
   sudo apt-get update
   sudo apt-get install -y xvfb
   ```
5. **Clone & Setup**:
   ```bash
   git clone your-repo-url
   cd webba
   npm install
   npx playwright install chromium --with-deps
   ```
6. **Run with PM2**:
   ```bash
   npm install -g pm2
   Xvfb :99 -screen 0 1920x1080x24 &
   export DISPLAY=:99
   pm2 start server.js --name webba
   pm2 save
   pm2 startup
   ```

---

## 🔧 Environment Variables

Set these in your hosting platform:

- `PORT` - Server port (default: 3000)
- `HEADLESS=true` - Required for cloud platforms (browser runs in background)
- `NODE_ENV=production` - Production mode

---

## 📝 Usage After Deployment

Once deployed, access your app at:
```
https://your-app-url.com/operate?email=your@email.com&password=yourpass&fileNumber=12345
```

---

## ⚠️ Important Notes

- **Headless Mode**: On cloud platforms, set `HEADLESS=true` since there's no display
- **Playwright Browsers**: Make sure build command includes `npx playwright install chromium --with-deps`
- **Port**: Most platforms set PORT automatically, but you can override it
- **WebSocket**: Ensure your platform supports WebSocket connections (Railway, Render, Fly.io all do)

---

## 🐳 Docker Deployment

If using Docker (Fly.io, Railway, etc.):

```bash
docker build -t webba .
docker run -p 3000:3000 -e HEADLESS=true webba
```

The Dockerfile is already configured with Xvfb for virtual display support.

