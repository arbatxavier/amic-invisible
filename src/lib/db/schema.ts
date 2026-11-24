import { sqliteTable, text, integer, index, unique } from 'drizzle-orm/sqlite-core';

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  eventDate: integer('eventDate'),
  location: text('location'),
  budget: text('budget'),
  rules: text('rules'),
  rulesEs: text('rulesEs'),
  status: text('status').notNull().default('DRAFT'),
  avoidTwoCycles: integer('avoidTwoCycles', { mode: 'boolean' }).notNull().default(false),
  messageTemplate: text('messageTemplate'),
  messageTemplateEs: text('messageTemplateEs'),
  createdAt: integer('createdAt').notNull(),
  updatedAt: integer('updatedAt').notNull(),
});

export const participants = sqliteTable(
  'participants',
  {
    id: text('id').primaryKey(),
    eventId: text('eventId').notNull(),
    name: text('name').notNull(),
    phone: text('phone'),
    language: text('language').notNull().default('ca'),
    token: text('token').notNull(),
    assignedToId: text('assignedToId'),
    whatsappStatus: text('whatsappStatus').notNull().default('PENDING'),
    whatsappSentAt: integer('whatsappSentAt'),
    viewedAt: integer('viewedAt'),
    createdAt: integer('createdAt').notNull(),
    updatedAt: integer('updatedAt').notNull(),
  },
  (t) => [
    unique('participants_token_unique').on(t.token),
    index('participants_event_idx').on(t.eventId),
  ],
);

export const exclusions = sqliteTable(
  'exclusions',
  {
    id: text('id').primaryKey(),
    eventId: text('eventId').notNull(),
    giverId: text('giverId').notNull(),
    receiverId: text('receiverId').notNull(),
    reason: text('reason').notNull(),
    createdAt: integer('createdAt').notNull(),
  },
  (t) => [
    index('exclusions_event_idx').on(t.eventId),
    unique('exclusions_unique').on(t.eventId, t.giverId, t.receiverId),
  ],
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Participant = typeof participants.$inferSelect;
export type NewParticipant = typeof participants.$inferInsert;
export type Exclusion = typeof exclusions.$inferSelect;
export type NewExclusion = typeof exclusions.$inferInsert;
