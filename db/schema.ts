import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const closedDates = sqliteTable('closed_dates', { date: text('date').primaryKey() });
export const bookingSettings = sqliteTable('booking_settings', {
  id: integer('id').primaryKey(),
  statusEnabled: integer('status_enabled').notNull().default(0),
  largeCarPercent: integer('large_car_percent').notNull().default(0),
  weeksAhead: integer('weeks_ahead').notNull().default(8),
  insideMinutes: integer('inside_minutes').notNull().default(30),
  outsideMinutes: integer('outside_minutes').notNull().default(30),
  weekdays: integer('weekdays').notNull().default(44),
  mapsUrl: text('maps_url').notNull().default('https://maps.app.goo.gl/eLbrjaFsUCS2t9VNA'),
});
export const prices=sqliteTable('prices',{id:integer('id').primaryKey(),inside:integer('inside'),outside:integer('outside'),fluid:integer('fluid')});
export const contact = sqliteTable('contact', {
  id: integer('id').primaryKey(),
  name: text('name').notNull().default(''),
  phone: text('phone').notNull().default(''),
  email: text('email').notNull().default(''),
  address: text('address').notNull().default(''),
  vipps: text('vipps').notNull().default(''),
});
export const bookings = sqliteTable(
  'bookings',
  {
    id: text('id').primaryKey(),
    statusCode: text('status_code').unique(),
    status: integer('status').notNull().default(0),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    date: text('date').notNull(),
    start: integer('start').notNull(),
    duration: integer('duration').notNull(),
    inside: integer('inside').notNull(),
    outside: integer('outside').notNull(),
    created: integer('created').notNull(),
    fluid: integer('fluid').notNull().default(0),
    largeCar: integer('large_car').notNull().default(0),
    polish: integer('polish').notNull().default(0),
    price: integer('price'),
  },
  (t) => [index('idx_bookings_date_start').on(t.date, t.start)],
);
export const admins = sqliteTable('admins', {
  id: integer('id').primaryKey(),
  username: text('username').notNull(),
  hash: text('hash').notNull(),
  salt: text('salt').notNull(),
  version: integer('version').notNull().default(1),
  recoveryEmail: text('recovery_email').notNull().default(''),
});
export const passwordResets = sqliteTable('password_resets', {
  token: text('token').primaryKey(),
  email: text('email').notNull(),
  version: integer('version').notNull(),
  expires: integer('expires').notNull(),
});
export const sessions = sqliteTable('sessions', {
  token: text('token').primaryKey(),
  expires: integer('expires').notNull(),
  version: integer('version').notNull(),
  viewerId: text('viewer_id'),
});
export const viewers = sqliteTable('viewers', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  hash: text('hash').notNull(),
  salt: text('salt').notNull(),
  version: integer('version').notNull().default(1),
  active: integer('active').notNull().default(1),
});
export const attempts = sqliteTable('attempts', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  until: integer('until').notNull(),
});

export const polishSettings = sqliteTable('polish_settings', {id:integer('id').primaryKey(),enabled:integer('enabled').notNull().default(0),minutes:integer('minutes').notNull().default(60),price:integer('price')});
