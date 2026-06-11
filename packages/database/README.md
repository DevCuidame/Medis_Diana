# Database Package

Database schemas, migrations, and seed data for Acaripole.

## Structure

```
src/
├── schema/         # SQL schema definitions
└── migrations/     # Database migrations
```

## Schema

The initial schema includes:

- **users** table with UUID primary key, email, name, password hash, and timestamps
- Automatic `updated_at` triggers
- Indexed email field for performance

## Migrations

Migrations are run sequentially to version control your database schema.

### Run Migrations

```bash
pnpm migrate
```

## Adding New Migrations

1. Create a new file in `src/migrations/` with naming pattern: `001_description.ts`
2. Export a migration object with `up()` and `down()` functions
3. Add to the migrations array in `runner.ts`

Example:

```typescript
const createPostsTable: Migration = {
  name: '002_create_posts_table',
  up: async (pool) => {
    await pool.query(`
      CREATE TABLE posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  },
  down: async (pool) => {
    await pool.query('DROP TABLE posts;');
  },
};
```

## Seed Data

Placeholder for seed functions to populate development databases.

## Contributing

- Keep migrations small and focused
- Always provide both `up` and `down` functions
- Test migrations in development before merging
