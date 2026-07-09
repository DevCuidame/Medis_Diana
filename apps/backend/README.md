# medisdiana Backend

Express.js backend server for medisdiana project with PostgreSQL database.

## Features

- ⚡ **Express.js** for HTTP server
- 🗄️ **PostgreSQL** for relational database
- 🔐 **JWT** for authentication
- 📝 **TypeScript** for type safety
- 🏗️ **Clean Architecture** with Controllers, Services, and Repositories
- ⚠️ **Custom Error Handling** with proper HTTP status codes
- 🔐 **CORS** support for frontend communication

## Project Structure

```
src/
├── config/              # Configuration (database, env)
├── controllers/         # Request handlers
├── services/           # Business logic
├── repositories/       # Database access layer
├── middleware/         # Express middleware
├── routes/            # API endpoints
├── types/             # TypeScript interfaces
├── utils/             # Helper functions
├── validators/        # Request validation
├── server.ts          # Express app setup
└── index.ts           # Entry point
migrations/            # Database migrations
seeders/              # Database seeds
```

## Development

### Prerequisites

- Node.js 18+
- pnpm 9+
- PostgreSQL 12+

### Setup

```bash
# Install dependencies
pnpm install

# Create .env.local from .env.example
cp .env.example .env.local

# Update .env.local with your PostgreSQL credentials
```

### Commands

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint

# Format code
pnpm format

# Run tests
pnpm test

# Run migrations
pnpm migrate
```

## API Endpoints

- `GET /api/health` - Health check endpoint

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```
DATABASE_URL=postgresql://user:password@localhost:5432/medisdiana_dev
NODE_ENV=development
PORT=3007
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5173
```

## Technologies

- **Runtime:** Node.js
- **Framework:** Express 4
- **Database:** PostgreSQL
- **Authentication:** JWT
- **Language:** TypeScript 5
- **Linting:** ESLint + Prettier

## Contributing

See [CONTRIBUTING.md](../../docs/CONTRIBUTING.md) for guidelines.
