import { PrismaClient } from '../generated/prisma/index.js';

const globalForPrisma = global;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: { url: process.env.DATABASE_URL }
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export const connectPostgres = async () => {
  await prisma.$connect();
  console.log('Connected to PostgreSQL database');
  return prisma;
};

export default prisma;
