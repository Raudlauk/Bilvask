ALTER TABLE `bookings` ADD `status_code` text;--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_status_code_unique` ON `bookings` (`status_code`);