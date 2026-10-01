CREATE TABLE `polish_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`minutes` integer DEFAULT 60 NOT NULL,
	`price` integer
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `polish` integer DEFAULT 0 NOT NULL;