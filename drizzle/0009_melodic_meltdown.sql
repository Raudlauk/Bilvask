ALTER TABLE `booking_settings` ADD `inside_minutes` integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `booking_settings` ADD `outside_minutes` integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `booking_settings` ADD `weekdays` integer DEFAULT 44 NOT NULL;