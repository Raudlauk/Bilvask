CREATE TABLE `booking_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`action` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`old_date` text NOT NULL,
	`old_start` integer NOT NULL,
	`new_date` text,
	`new_start` integer,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_booking_changes_created` ON `booking_changes` (`created`);--> statement-breakpoint
ALTER TABLE `booking_settings` ADD `customer_changes` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `customer_moves` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `customer_changed_at` integer;