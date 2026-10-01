ALTER TABLE `booking_settings` ADD `status_enabled` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `status` integer DEFAULT 0 NOT NULL;