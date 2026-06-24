import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const latestEvents = await prisma.event.findMany({
    take: 5,
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log("Latest Events from Supabase:");
  console.log(JSON.stringify(latestEvents, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  , 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
