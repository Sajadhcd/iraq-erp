# ============================================
# SIMS-ERP - Installation Guide
# ============================================
# 
# Prerequisites:
#   - Node.js 20+ 
#   - PostgreSQL 14+
#   - npm or yarn
#   - Git (optional)
#
# ============================================

## Quick Install (Windows)
1. Extract the project files
2. Open Command Prompt as Administrator
3. Navigate to the project folder
4. Run: scripts\install.bat
5. Follow the configuration wizard

## Quick Install (Linux/Mac)
1. Extract the project files
2. Open Terminal
3. Navigate to the project folder
4. Run: chmod +x scripts/install.sh && ./scripts/install.sh
5. Follow the configuration wizard

## Manual Installation

### Step 1: Configure Environment
```
cd server
copy .env.example .env
# Edit .env with your database credentials and JWT secret
```

### Step 2: Install Dependencies
```
# Backend
cd server
npm install

# Frontend
cd ..
npm install
```

### Step 3: Setup Database
```
cd server
npx prisma migrate deploy
npx prisma db seed
```

### Step 4: Build for Production
```
# Backend
cd server
npm run build

# Frontend
cd ..
npm run build
```

### Step 5: Start Services
```
# Option A: PM2 (Recommended for Production)
cd server
pm2 start ../ecosystem.config.js
cd ..
pm2 start npm --name sims-frontend -- start

# Option B: Docker
docker-compose up -d

# Option C: Direct (Development only)
cd server && npm run start:prod
# In another terminal: npm start
```

## Default Login
- Email: admin@system.com
- Password: 123456

**IMPORTANT:** Change the admin password immediately after first login!

## Production Checklist
- [ ] Change admin password
- [ ] Update JWT_SECRET in server/.env
- [ ] Update DATABASE_URL with secure password
- [ ] Configure CORS_ORIGINS for your domain
- [ ] Set up SSL/TLS certificates
- [ ] Configure backup schedule
- [ ] Set up monitoring alerts
- [ ] Configure email settings (Settings > Email)
- [ ] Set company profile (Settings > Company Profile)
- [ ] Configure tax settings
- [ ] Set up license key

## Support
- Documentation: See INSTALL.md
- Issues: https://github.com/your-repo/sims-erp/issues
- Email: support@your-domain.com
