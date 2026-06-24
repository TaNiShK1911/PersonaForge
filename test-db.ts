import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Testing DB Connection...");
  const start = Date.now();
  try {
    const res = await prisma.$queryRaw`SELECT 1 as result`;
    console.log("Success in", Date.now() - start, "ms", res);
  } catch(e) {
    console.error("Failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
