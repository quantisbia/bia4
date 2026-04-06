// prisma.config.ts - Prisma 7 Configuration for Neon PostgreSQL
// This file is used by Prisma CLI for migrations and generate
// The DATABASE_URL env var must be set in .env.local

export default {
  earlyAccess: true,
  schema: "./prisma/schema.prisma",
}
