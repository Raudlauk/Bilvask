CREATE TABLE `prices` (
	`id` integer PRIMARY KEY NOT NULL,
	`inside` integer,
	`outside` integer
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `fluid` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `price` integer;