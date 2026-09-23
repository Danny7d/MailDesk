import { db } from './client';
import { skeletonProbe } from './schema';
import { randomUUID } from 'node:crypto';

async function main() {
  console.log('Seeding database...');
  
  await db.insert(skeletonProbe).values({
    id: randomUUID(),
    note: 'M1 walking skeleton seed',
  });
  
  console.log('Seed completed');
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
