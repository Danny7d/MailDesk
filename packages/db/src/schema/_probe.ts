import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

// Throwaway table for M1 walking skeleton - will be deleted in M2
export const skeletonProbe = pgTable('skeleton_probe', {
  id: uuid('id').primaryKey(),
  note: text('note').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
