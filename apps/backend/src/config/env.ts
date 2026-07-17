import dotenv from 'dotenv';

dotenv.config();

interface Env {
  DATABASE_URL: string;
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  JWT_SECRET: string;
  CORS_ORIGIN: string;
  EMAIL_HOST: string;
  EMAIL_PORT: number;
  EMAIL_SECURE: boolean;
  EMAIL_USER: string;
  EMAIL_PASSWORD: string;
  EMAIL_FROM: string;
  ADMIN_EMAIL: string;
  DOC_API_URL: string;
  DOC_DIANA_EMAIL: string;
  DOC_DIANA_PASSWORD: string;
}

const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

export const env: Env = {
  DATABASE_URL: process.env.DATABASE_URL || '',
  NODE_ENV: (process.env.NODE_ENV as Env['NODE_ENV']) || 'development',
  PORT: Number(process.env.PORT) || 3007,
  JWT_SECRET: process.env.JWT_SECRET || '',
  CORS_ORIGIN:
    process.env.CORS_ORIGIN ||
    (process.env.NODE_ENV === 'production' ? 'https://docxime.cuidame.tech' : 'http://localhost:5173'),
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: Number(process.env.EMAIL_PORT) || 465,
  EMAIL_SECURE: process.env.EMAIL_SECURE === 'true',
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || '',
  EMAIL_FROM: process.env.EMAIL_USER || '',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || process.env.EMAIL_USER || '',
  DOC_API_URL: process.env.DOC_API_URL || 'https://doc-api.cuidame.tech/api',
  DOC_DIANA_EMAIL: process.env.DOC_DIANA_EMAIL || '',
  DOC_DIANA_PASSWORD: process.env.DOC_DIANA_PASSWORD || '',
};
