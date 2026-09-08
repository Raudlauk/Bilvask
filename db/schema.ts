import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const bookings = sqliteTable(
  'bookings',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    date: text('date').notNull(),
    start: integer('start').notNull(),
    duration: integer('duration').notNull(),
    inside: integer('inside').notNull(),
    outside: integer('outside').notNull(),
    created: integer('created').notNull(),
  },
  (t) => [index('idx_bookings_date_start').on(t.date, t.start)],
);
export const admins = sqliteTable('admins', {
  id: integer('id').primaryKey(),
  username: text('username').notNull(),
  hash: text('hash').notNull(),
  salt: text('salt').notNull(),
  version: integer('version').notNull().default(1),
});
export const sessions = sqliteTable('sessions', {
  token: text('token').primaryKey(),
  expires: integer('expires').notNull(),
  version: integer('version').notNull(),
});
export const attempts = sqliteTable('attempts', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  until: integer('until').notNull(),
});
