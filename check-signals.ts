import { db } from './src/lib/db';

async function checkSignals() {
  const signalCount = await db.identitySignal.count();
  console.log('Total Identity Signals:', signalCount);
  
  if (signalCount > 0) {
    const sample = await db.identitySignal.findFirst();
    console.log('Sample signal:', JSON.stringify(sample, null, 2));
  }
  
  const userCount = await db.user.count();
  console.log('Total Users:', userCount);
  
  await db.$disconnect();
}

checkSignals();
