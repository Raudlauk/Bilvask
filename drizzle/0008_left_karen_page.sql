CREATE TABLE `viewers` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`hash` text NOT NULL,
	`salt` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `viewers_username_unique` ON `viewers` (`username`);--> statement-breakpoint
ALTER TABLE `sessions` ADD `viewer_id` text;