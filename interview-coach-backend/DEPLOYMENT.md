# Deployment Guide

Quick start guides for deploying the backend to common platforms.

## Local Testing (Before Deployment)

```bash
# 1. Test all endpoints locally
npm run dev

# 2. Open another terminal and test
curl http://localhost:5000/api/health

# 3. Test question generation
curl -X POST http://localhost:5000/api/questions/generate \
  -H "Content-Type: application/json" \
  -d '{"type":"HR","difficulty":"Easy"}'

# 4. Check response in terminal
```

## Deploy to Heroku (< 5 minutes)

### Prerequisites
- Heroku CLI installed
- GitHub account with code pushed

### Steps

1. **Login to Heroku:**
   ```bash
   heroku login
   ```

2. **Create app:**
   ```bash
   heroku create your-app-name
   ```

3. **Set environment variables:**
   ```bash
   heroku config:set CORS_ORIGIN=https://yourdomain.com
   heroku config:set NODE_ENV=production
   ```

4. **Deploy:**
   ```bash
   git push heroku main
   ```

5. **View logs:**
   ```bash
   heroku logs --tail
   ```

**Your API is now live at:** `https://your-app-name.herokuapp.com/api`

---

## Deploy to Railway (< 5 minutes)

### Steps

1. **Push to GitHub**

2. **Go to railway.app**
   - Click "Create Project"
   - Connect GitHub
   - Select this repository

3. **Add environment variables:**
   - `PORT=5000`
   - `CORS_ORIGIN=https://yourdomain.com`
   - `NODE_ENV=production`

4. **Railway automatically deploys**

**Your API is now live at:** `https://your-project-railway.app/api`

---

## Deploy to Vercel (Serverless)

Backend requires persistent server, **not recommended for Vercel**.

Use Railway, Heroku, or traditional VPS instead.

---

## Deploy to AWS (EC2)

### Quick Setup

1. **Launch EC2 instance:**
   - Ubuntu 22.04 LTS
   - t3.micro (free tier eligible)
   - Security group: Allow ports 22 (SSH), 5000 (API)

2. **SSH into instance:**
   ```bash
   ssh -i your-key.pem ubuntu@your-instance-ip
   ```

3. **Install Node.js:**
   ```bash
   sudo apt update
   sudo apt install nodejs npm
   ```

4. **Clone repository:**
   ```bash
   git clone https://github.com/your-repo/interview-coach-backend.git
   cd interview-coach-backend
   ```

5. **Install and start:**
   ```bash
   npm install
   npm start
   ```

6. **Use PM2 for persistence:**
   ```bash
   sudo npm install -g pm2
   pm2 start src/server.js
   pm2 startup
   pm2 save
   ```

---

## Deploy to DigitalOcean (App Platform)

### Steps

1. **Push to GitHub**

2. **Create New App:**
   - Choose GitHub repository
   - Select branch
   - Auto-deploy enabled

3. **Set environment variables:**
   - PORT: 5000
   - CORS_ORIGIN: https://yourapp.com
   - NODE_ENV: production

4. **Click "Create"**

**Your app is deployed and gets a `.ondigitalocean.app` domain**

---

## Environment Variables (Production)

```bash
# Required
PORT=5000
NODE_ENV=production

# Important: CORS for your frontend
CORS_ORIGIN=https://yourdomain.com

# Optional for future features
# DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/db
# JWT_SECRET=your-secret-key
```

---

## Database Migration (Optional Future)

If you want persistent sessions, replace in-memory storage:

### Option 1: MongoDB

1. **Install:**
   ```bash
   npm install mongoose
   ```

2. **Update sessionService.js** to use MongoDB instead of array

3. **Set environment:**
   ```bash
   DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/interview-coach
   ```

### Option 2: PostgreSQL

1. **Install:**
   ```bash
   npm install pg
   ```

2. **Update sessionService.js** to use pg client

3. **Set environment:**
   ```bash
   DATABASE_URL=postgresql://user:pass@host:5432/interview_coach
   ```

---

## Performance Optimization (Post-MVP)

### Add Caching
```bash
npm install redis
```

Cache question bank in Redis for faster responses.

### Add Database Indexing
- Index on `session.id`
- Index on `session.createdAt`
- Index on `session.status`

### Load Testing
```bash
npm install -g loadtest

# Test 100 requests/sec
loadtest -c 100 -r 100 http://your-api.com/api/health
```

---

## Monitoring & Logging

### Sentry (Error Tracking)
```bash
npm install @sentry/node

# In server.js
import * as Sentry from "@sentry/node";
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### LogRocket (Session Replay)
Add to frontend to track API issues.

---

## SSL/HTTPS

**All production deployments should use HTTPS**

- Heroku: Automatic ✅
- Railway: Automatic ✅
- AWS: Use Certificate Manager ✅
- DigitalOcean: Automatic ✅

---

## Firewall Rules

### Recommended Production Setup

```
✅ Frontend domain → Allow (CORS_ORIGIN)
❌ All other origins → Deny (by default)
❌ Port 5000 → Only from load balancer/CDN
✅ Port 80 → Redirect to HTTPS
✅ Port 443 → Public (HTTPS)
```

---

## Backup Strategy

**Current:** No persistent data (all in-memory)

**With database:** Automated daily backups + manual exports

---

## Scaling Considerations

### Current Bottlenecks
- In-memory storage (max ~1000 sessions before memory issues)
- Single process (no load balancing)

### Solutions
- Move to database (unlimited sessions)
- Use process manager (PM2, forever)
- Add load balancer (Nginx, HAProxy)
- Container orchestration (Docker + Kubernetes)

---

## Quick Comparison

| Platform | Setup Time | Cost | Ease | Persistence |
|----------|-----------|------|------|-------------|
| Heroku | 2 min | $7/mo | ⭐⭐⭐⭐⭐ | ✅ |
| Railway | 2 min | $5/mo | ⭐⭐⭐⭐⭐ | ✅ |
| AWS | 10 min | $0-20/mo | ⭐⭐⭐ | ✅ |
| DigitalOcean | 5 min | $5/mo | ⭐⭐⭐⭐ | ✅ |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 502 Bad Gateway | Check backend is running, logs for errors |
| CORS error from frontend | Update CORS_ORIGIN to match frontend domain |
| Slow responses | Check database connection, add caching |
| Memory leaks | Monitor with PM2: `pm2 monit` |

---

## Post-Deployment Checklist

- [ ] Backend is running and accessible
- [ ] Health check endpoint responds
- [ ] CORS properly configured
- [ ] Environment variables set
- [ ] Frontend API URL updated
- [ ] Test full interview flow
- [ ] Check error logs
- [ ] Monitor performance
- [ ] Set up backups
- [ ] SSL certificate active

---

## Next Steps

1. **Verify deployment:**
   ```bash
   curl https://your-api.com/api/health
   ```

2. **Update frontend:**
   - Set `VITE_API_URL=https://your-api.com/api`

3. **Test end-to-end:**
   - Start interview
   - Submit feedback
   - Check history

4. **Monitor:**
   - Set up error tracking (Sentry)
   - Monitor API performance
   - Check logs regularly

---

See README.md for local development and API_REFERENCE.md for all endpoints.
