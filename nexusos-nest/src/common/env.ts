import { config } from 'dotenv';
import { resolve } from 'node:path';

// Explicit environment wins; local Nest values override the original project's .env.
config({ path: [resolve(process.cwd(), '.env'), resolve(__dirname, '../../.env'), resolve(__dirname, '../../../.env')], quiet: true });
export const prod = process.env.NODE_ENV === 'production' || process.env.SPRING_PROFILES_ACTIVE === 'prod';
export const origins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000').split(',').map(v => v.trim()).filter(Boolean);
export const uploadsPath = resolve(process.env.UPLOADS_PATH || resolve(__dirname, '../../../uploads'));
