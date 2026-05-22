import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';
import path from 'path';

// Carrega variáveis do .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
