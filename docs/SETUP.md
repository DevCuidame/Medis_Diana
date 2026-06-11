# Setup Guide

## Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org))
- **pnpm** 9+ (`npm install -g pnpm`)
- **PostgreSQL** 12+ ([download](https://www.postgresql.org/download))
- **Git** ([download](https://git-scm.com))

## Quick Start

### 1. Clone & Install

```bash
# Clone the repository
git clone <repository-url>
cd Acaripole

# Install dependencies (all apps and packages)
pnpm install
```

### 2. Database Setup

```bash
# Option A: Using Docker (recommended)
docker run -d --name acaripole-postgres \
  -e POSTGRES_USER=acaripole \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=acaripole_dev \
  -p 5432:5432 \
  postgres:15

# Option B: Using local PostgreSQL
psql -U postgres
CREATE DATABASE acaripole_dev;
```

### 3. Environment Configuration

```bash
# Backend
cp apps/backend/.env.example apps/backend/.env.local

# Edit apps/backend/.env.local with your database credentials:
# DATABASE_URL=postgresql://acaripole:your_password@localhost:5432/acaripole_dev
# JWT_SECRET=your-secret-key-change-in-production

# Frontend
cp apps/frontend/.env.example apps/frontend/.env.local

# Edit apps/frontend/.env.local (usually defaults are fine):
# VITE_API_URL=http://localhost:3000/api
# VITE_APP_NAME=Acaripole
# VITE_ENVIRONMENT=development
```

### 4. Database Migrations

```bash
# Run migrations
pnpm -F @acaripole/backend migrate
```

### 5. Start Development Servers

```bash
# Start both frontend and backend with HMR
pnpm dev

# Or separately:
# Terminal 1 - Frontend (http://localhost:5173)
pnpm -F @acaripole/frontend dev

# Terminal 2 - Backend (http://localhost:3000)
pnpm -F @acaripole/backend dev
```

## Verify Installation

- Open http://localhost:5173 in your browser
- You should see the Acaripole welcome page
- Check http://localhost:3000/api/health for backend health status

## Common Commands

### Development
```bash
# Start all dev servers
pnpm dev

# Start specific app
pnpm -F @acaripole/frontend dev
pnpm -F @acaripole/backend dev

# Format code
pnpm format

# Lint code
pnpm lint
```

### Building
```bash
# Build all
pnpm build

# Build specific app
pnpm build:frontend
pnpm build:backend
```

### Testing
```bash
# Run all tests
pnpm test

# Run specific app tests
pnpm -F @acaripole/backend test
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port
lsof -i :5173  # Frontend
lsof -i :3000  # Backend

# Kill process
kill -9 <PID>
```

### Database Connection Error

1. Verify PostgreSQL is running:
   ```bash
   psql -U postgres -c "SELECT 1"
   ```

2. Check your `.env.local` DATABASE_URL format:
   ```
   postgresql://username:password@localhost:5432/database_name
   ```

3. Ensure database exists:
   ```bash
   psql -U postgres -l | grep acaripole_dev
   ```

### pnpm Install Issues

```bash
# Clear cache
pnpm store prune
pnpm install --no-frozen-lockfile
```

### Module Not Found

```bash
# Regenerate node_modules
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## IDE Setup

### VS Code

Install recommended extensions:
- **ES7+ React/Redux/React-Native snippets**
- **ESLint**
- **Prettier**
- **Thunder Client** or **REST Client** (for API testing)
- **PostgreSQL** (optional)

Create `.vscode/settings.json`:
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Next Steps

1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the codebase structure
2. Check [API.md](./API.md) for API endpoint documentation
3. Review [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines
4. Start building features!

## Getting Help

- Check existing issues and documentation
- Ask in team Slack/Discord
- Create a detailed issue with reproducible steps
