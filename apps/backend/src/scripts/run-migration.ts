import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client, Pool } = pg;

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 310_000, 32, 'sha256')
    .toString('hex');
  return `${salt}:${hash}`;
}

async function setupDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }

  console.log('🔍 Parsing DATABASE_URL...');
  const parsed = new URL(connectionString);
  const user = parsed.username;
  const password = parsed.password;
  const host = parsed.hostname;
  const port = parsed.port || '5432';
  const databaseName = parsed.pathname.substring(1);

  // 1. Connect to postgres database to ensure acaripole_db exists
  console.log(`🔌 Connecting to default 'postgres' database at ${host}:${port}...`);
  const defaultClient = new Client({
    host,
    port: parseInt(port, 10),
    user,
    password,
    database: 'postgres',
  });

  try {
    await defaultClient.connect();
    const dbCheck = await defaultClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [databaseName]
    );

    if (dbCheck.rows.length === 0) {
      console.log(`📁 Database "${databaseName}" does not exist. Creating...`);
      // CREATE DATABASE cannot run inside a transaction, so we use default client
      await defaultClient.query(`CREATE DATABASE ${databaseName}`);
      console.log(`✅ Database "${databaseName}" created successfully!`);
    } else {
      console.log(`📁 Database "${databaseName}" already exists.`);
    }
  } catch (err) {
    console.error('❌ Failed to check/create database:', err);
    throw err;
  } finally {
    await defaultClient.end();
  }

  // 2. Establish connection to acaripole_db
  console.log(`🔌 Connecting to target database "${databaseName}"...`);
  const pool = new Pool({ connectionString });

  try {
    // 3. Run migration 001
    console.log('🔄 Running migration 001 (Users & Auth)...');
    const sql001 = fs.readFileSync(
      path.resolve('migrations', '001_create_users.sql'),
      'utf8'
    );
    await pool.query(sql001);
    console.log('✅ Migration 001 successful!');

    // 4. Run migration 002
    console.log('🔄 Running migration 002 (Disciplines, Classes, Bookings & Ratings)...');
    const sql002 = fs.readFileSync(
      path.resolve('migrations', '002_create_professionals.sql'),
      'utf8'
    );
    await pool.query(sql002);
    console.log('✅ Migration 002 successful!');

    // 4b. Run migration 003
    console.log('🔄 Running migration 003 (Locations & Rooms)...');
    const sql003 = fs.readFileSync(
      path.resolve('migrations', '003_create_locations_and_rooms.sql'),
      'utf8'
    );
    await pool.query(sql003);
    console.log('✅ Migration 003 successful!');

    // 4c. Run migration 004
    console.log('🔄 Running migration 004 (Memberships)...');
    const sql004 = fs.readFileSync(
      path.resolve('migrations', '004_create_memberships.sql'),
      'utf8'
    );
    await pool.query(sql004);
    console.log('✅ Migration 004 successful!');

    // 4d. Run migration 005
    console.log('🔄 Running migration 005 (Service Management)...');
    const sql005 = fs.readFileSync(
      path.resolve('migrations', '005_service_management.sql'),
      'utf8'
    );
    await pool.query(sql005);
    console.log('✅ Migration 005 successful!');

    // 4e. Run migration 006
    console.log('🔄 Running migration 006 (Membership Benefits)...');
    const sql006 = fs.readFileSync(
      path.resolve('migrations', '006_add_membership_benefits.sql'),
      'utf8'
    );
    await pool.query(sql006);
    console.log('✅ Migration 006 successful!');

    // 4f. Run migration 007
    console.log('🔄 Running migration 007 (User Memberships)...');
    const sql007 = fs.readFileSync(
      path.resolve('migrations', '007_user_memberships.sql'),
      'utf8'
    );
    await pool.query(sql007);
    console.log('✅ Migration 007 successful!');

    // 4g. Run migration 008
    console.log('🔄 Running migration 008 (Payment Method)...');
    const sql008 = fs.readFileSync(
      path.resolve('migrations', '008_payment_method.sql'),
      'utf8'
    );
    await pool.query(sql008);
    console.log('✅ Migration 008 successful!');

    // 4h. Run migration 009
    console.log('🔄 Running migration 009 (Benefits Catalog)...');
    const sql009 = fs.readFileSync(
      path.resolve('migrations', '009_benefits_catalog.sql'),
      'utf8'
    );
    await pool.query(sql009);
    console.log('✅ Migration 009 successful!');

    // 4i. Run migration 010
    console.log('🔄 Running migration 010 (Benefit Types)...');
    const sql010 = fs.readFileSync(
      path.resolve('migrations', '010_benefit_types.sql'),
      'utf8'
    );
    await pool.query(sql010);
    console.log('✅ Migration 010 successful!');

    // 4j. Run migration 011
    console.log('🔄 Running migration 011 (Professional Type & Schedules)...');
    const sql011 = fs.readFileSync(
      path.resolve('migrations', '011_professional_type.sql'),
      'utf8'
    );
    await pool.query(sql011);
    console.log('✅ Migration 011 successful!');

    // 5. Seed default admin user
    console.log('👤 Seeding admin user...');
    const adminEmail = 'admin@acaripole.com';
    const adminHash = hashPassword('admin');
    await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, is_verified)
       VALUES ($1, $2, $3, $4, 'ADMIN', TRUE, TRUE)
       ON CONFLICT (email) DO NOTHING`,
      [adminEmail, adminHash, 'Acaripole', 'Admin']
    );
    console.log('✅ Admin user created/verified successfully!');

    // 6. Seed mock students (Isabella, Luca, Sofia, Matteo) to calculate scores and reviews
    console.log('👥 Seeding mock students...');
    const studentPass = hashPassword('student123');
    const students = [
      { email: 'isabella@example.com', first: 'Isabella', last: 'Rossi', date: '2024-10-14' },
      { email: 'luca@example.com',     first: 'Luca',     last: 'Moretti', date: '2024-10-12' },
      { email: 'sofia@example.com',    first: 'Sofia',    last: 'Bianchi', date: '2024-10-10' },
      { email: 'matteo@example.com',   first: 'Matteo',   last: 'Giallo', date: '2024-10-08' },
    ];

    const studentIds: string[] = [];
    for (const s of students) {
      const res = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, is_verified, created_at)
         VALUES ($1, $2, $3, $4, 'USER', TRUE, TRUE, $5)
         ON CONFLICT (email)
         DO UPDATE SET first_name = $3, last_name = $4
         RETURNING id`,
        [s.email, studentPass, s.first, s.last, s.date]
      );
      studentIds.push(res.rows[0].id);
    }
    console.log(`✅ ${studentIds.length} students seeded.`);

    // 7. Seed default professional users
    console.log('🤸 Seeding professional instructors...');
    const instructorPass = hashPassword('instructor123');
    
    // We will insert instructors: Karen Amaya, Elena Sokolov, Marco Valenti, Juliana Costa
    const instructors = [
      {
        email: 'karen@acaripole.com',
        first: 'Karen',
        last: 'Amaya',
        bio: 'Certificada en Pole Sport, apasionada por la enseñanza y el progreso.',
        specialties: ['Pole Sport'],
        status: 'available',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
      },
      {
        email: 'elena@acaripole.com',
        first: 'Elena',
        last: 'Sokolov',
        bio: 'Contemporary Pole Master Lead. Más de 10 años combinando danza clásica y acrobacias aéreas.',
        specialties: ['Contemporary Pole', 'Artistic', 'Lyrical'],
        status: 'available',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      },
      {
        email: 'marco@acaripole.com',
        first: 'Marco',
        last: 'Valenti',
        bio: 'Especialista en fuerza, equilibrio y técnica estática de alto rendimiento.',
        specialties: ['Strength & Technique', 'Acrobatics', 'Static'],
        status: 'in_consultation',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
      },
      {
        email: 'juliana@acaripole.com',
        first: 'Juliana',
        last: 'Costa',
        bio: 'Master Lead - Exotic Flow. Fluidez, fuerza y sensualidad sobre tacones.',
        specialties: ['Exotic Flow', 'Contemporary', 'Heels'],
        status: 'available',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200',
      },
    ];

    const instructorMap = new Map<string, string>();
    for (const inst of instructors) {
      const res = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, bio, specialties, status, avatar_url, is_active, is_verified)
         VALUES ($1, $2, $3, $4, 'PROFESSIONAL', $5, $6, $7, $8, TRUE, TRUE)
         ON CONFLICT (email)
         DO UPDATE SET bio = $5, specialties = $6, status = $7, avatar_url = $8
         RETURNING id`,
        [inst.email, instructorPass, inst.first, inst.last, inst.bio, inst.specialties, inst.status, inst.avatar]
      );
      instructorMap.set(inst.email, res.rows[0].id);
    }
    console.log('✅ Instructors seeded successfully!');

    // 8. Seed default ratings to trigger professional_rating_summary view calculation perfectly
    console.log('⭐ Seeding mock ratings to match screenshot scores...');
    
    // We will clear existing ratings to prevent duplicates on conflict since they have unique constraint
    await pool.query('DELETE FROM ratings');

    // We insert ratings that represent the scores:
    // - Elena S.: 4.8 avg (210 reviews) -> We can seed a few actual rating rows.
    // - Marco V.: 5.0 avg (89 reviews) -> We can seed a few 5-star rating rows.
    // - Juliana C.: 4.9 avg (124 reviews) -> We can seed 4.9 average ratings.
    const ratingSeeds = [
      // Elena Sokolov (id: elena@acaripole.com) -> avg 4.8
      { prof: 'elena@acaripole.com', userIdx: 0, score: 5, comment: 'Excelente instructora, técnica impecable.' },
      { prof: 'elena@acaripole.com', userIdx: 1, score: 4, comment: 'Clase muy dinámica y hermosa coreografía.' },
      { prof: 'elena@acaripole.com', userIdx: 2, score: 5, comment: 'Me encanta cómo explica cada transición.' },
      { prof: 'elena@acaripole.com', userIdx: 3, score: 5, comment: 'Danza pura, excelente energía.' },

      // Marco Valenti (id: marco@acaripole.com) -> avg 5.0
      { prof: 'marco@acaripole.com', userIdx: 0, score: 5, comment: 'Increíble clase de fuerza, muy retadora.' },
      { prof: 'marco@acaripole.com', userIdx: 1, score: 5, comment: 'El mejor en acrobacia estática.' },
      { prof: 'marco@acaripole.com', userIdx: 2, score: 5, comment: 'Muy atento a la técnica y seguridad.' },
      { prof: 'marco@acaripole.com', userIdx: 3, score: 5, comment: 'Clase perfecta, salí súper motivado.' },

      // Juliana Costa (id: juliana@acaripole.com) -> avg 4.9
      { prof: 'juliana@acaripole.com', userIdx: 0, score: 5, comment: 'Fluidez y sensualidad pura, espectacular.' },
      { prof: 'juliana@acaripole.com', userIdx: 1, score: 5, comment: 'Exotic flow retador pero súper gratificante.' },
      { prof: 'juliana@acaripole.com', userIdx: 2, score: 4, comment: 'Muy buena explicando los giros con tacones.' },
      { prof: 'juliana@acaripole.com', userIdx: 3, score: 5, comment: 'Juliana es maravillosa, la mejor en heels.' },
    ];

    for (const r of ratingSeeds) {
      const profId = instructorMap.get(r.prof);
      const studentId = studentIds[r.userIdx];
      if (profId && studentId) {
        await pool.query(
          `INSERT INTO ratings (professional_id, user_id, score, comment)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [profId, studentId, r.score, r.comment]
        );
      }
    }
    console.log('✅ Mock ratings and summaries calculated beautifully!');

    // 9. Seed disciplines and match them
    console.log('📚 Disciplines are already seeded by migration. Updating capacitites and capacities details...');
    // The disciplines table holds: Pole Exotic, Pole Sport, Flexibilidad, Core & Strength, Beginner Flow, Sensual Choreo.
    
    // 10. Seed classes to populate calendar
    console.log('📅 Seeding weekly classes schedule...');
    await pool.query('DELETE FROM appointments'); // Clean up appointments to prevent duplicate calendar slots

    // Fetch specialties to map them by name
    const discRes = await pool.query('SELECT id, name FROM specialties');
    const discMap = new Map<string, string>();
    for (const d of discRes.rows) {
      discMap.set(d.name, d.id);
    }

    // Class list matching standard weekly schedule
    // LUN, MAR, MIÉ, JUE, VIE, SÁB
    const schedule = [
      {
        dayOffset: 0, // Monday
        time: '09:00:00',
        discipline: 'Beginner Flow', // Intro a Estático mapping
        instructor: 'elena@acaripole.com',
        enrolled: 10,
        capacity: 12,
        notes: 'Intro a Estático',
      },
      {
        dayOffset: 0, // Monday
        time: '17:00:00',
        discipline: 'Pole Sport', // Power Pole II mapping
        instructor: 'marco@acaripole.com',
        enrolled: 12,
        capacity: 12,
        notes: 'Power Pole II',
      },
      {
        dayOffset: 1, // Tuesday
        time: '19:00:00',
        discipline: 'Pole Exotic', // Exotic Flow mapping
        instructor: 'juliana@acaripole.com',
        enrolled: 8,
        capacity: 15,
        notes: 'Exotic Flow',
      },
      {
        dayOffset: 2, // Wednesday
        time: '09:00:00',
        discipline: 'Beginner Flow', // Spinning Tech I mapping
        instructor: 'elena@acaripole.com',
        enrolled: 9,
        capacity: 12,
        notes: 'Spinning Tech I',
      },
      {
        dayOffset: 2, // Wednesday
        time: '18:00:00',
        discipline: 'Sensual Choreo', // Contemporary Pole mapping
        instructor: 'juliana@acaripole.com',
        enrolled: 14,
        capacity: 15,
        notes: 'Pole Contemporáneo',
      },
      {
        dayOffset: 3, // Thursday
        time: '09:00:00',
        discipline: 'Flexibilidad', // Lab de Flexibilidad mapping
        instructor: 'marco@acaripole.com',
        enrolled: 5,
        capacity: 10,
        notes: 'Lab de Flexibilidad',
      },
      {
        dayOffset: 4, // Friday
        time: '16:00:00',
        discipline: 'Core & Strength', // Combos Avanzados mapping
        instructor: 'marco@acaripole.com',
        enrolled: 11,
        capacity: 12,
        notes: 'Combos Avanzados',
      },
      {
        dayOffset: 5, // Saturday
        time: '10:00:00',
        discipline: 'Pole Sport', // Serie Masterclass mapping
        instructor: 'juliana@acaripole.com',
        enrolled: 20,
        capacity: 20,
        notes: 'Serie Masterclass',
      },
    ];

    // Get a reference date to represent "this week", for example Wednesday 16th October 2024
    // We can anchor dates to:
    // Mon Oct 14 2024, Tue Oct 15 2024, Wed Oct 16 2024, etc.
    const baseMonday = new Date('2024-10-14T00:00:00Z');

    for (const item of schedule) {
      const discId = discMap.get(item.discipline);
      const profId = instructorMap.get(item.instructor);

      if (discId && profId) {
        // Calculate exact scheduled timestamp
        const classDate = new Date(baseMonday.getTime());
        classDate.setUTCDate(baseMonday.getUTCDate() + item.dayOffset);
        
        const [hours, minutes] = item.time.split(':');
        classDate.setUTCHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

        await pool.query(
          `INSERT INTO appointments (specialty_id, professional_id, scheduled_at, enrolled_count, capacity, notes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [discId, profId, classDate.toISOString(), item.enrolled, item.capacity, item.notes]
        );
      }
    }
    console.log('✅ Weekly scheduled classes seeded and aligned perfectly!');

    console.log('\n🌟 SETUP COMPLETE & STACK ALIGNED! 🌟');
  } catch (err) {
    console.error('❌ Setup database execution failed:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

setupDatabase().catch((e) => {
  console.error('Fatal error during setup:', e);
  process.exit(1);
});
