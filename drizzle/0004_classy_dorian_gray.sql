CREATE TABLE `password_resets` (
	`token` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`version` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `admins` ADD `recovery_email` text DEFAULT '' NOT NULL;