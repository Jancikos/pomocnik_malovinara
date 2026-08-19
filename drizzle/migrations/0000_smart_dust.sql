CREATE TABLE `batches` (
	`id` text PRIMARY KEY NOT NULL,
	`cellar_id` text NOT NULL,
	`wine_id` text NOT NULL,
	`phase` text NOT NULL,
	`vessel_name` text NOT NULL,
	`vessel_type` text NOT NULL,
	`vessel_capacity` real NOT NULL,
	`vessel_location` text,
	`parent_batch_id` text,
	`volume` real NOT NULL,
	`status` text NOT NULL,
	`opened_at` integer NOT NULL,
	`closed_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`cellar_id`) REFERENCES `cellars`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`parent_batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `batches_cellar_status_idx` ON `batches` (`cellar_id`,`status`);--> statement-breakpoint
CREATE INDEX `batches_wine_idx` ON `batches` (`wine_id`);--> statement-breakpoint
CREATE INDEX `batches_parent_idx` ON `batches` (`parent_batch_id`);--> statement-breakpoint
CREATE INDEX `batches_vessel_name_idx` ON `batches` (`cellar_id`,`vessel_name`);--> statement-breakpoint
CREATE UNIQUE INDEX `batches_one_active_per_vessel_name` ON `batches` (`cellar_id`,`vessel_name`) WHERE "batches"."status" = 'ACTIVE';--> statement-breakpoint
CREATE TABLE `cellar_members` (
	`cellar_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'MEMBER' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`cellar_id`, `user_id`),
	FOREIGN KEY (`cellar_id`) REFERENCES `cellars`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cellars` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `interventions` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`type` text NOT NULL,
	`performed_at` integer NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `interventions_batch_date_idx` ON `interventions` (`batch_id`,`performed_at`);--> statement-breakpoint
CREATE TABLE `measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`type` text NOT NULL,
	`value` real NOT NULL,
	`unit` text NOT NULL,
	`measured_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `measurements_batch_type_date_idx` ON `measurements` (`batch_id`,`type`,`measured_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `transfer_destinations` (
	`id` text PRIMARY KEY NOT NULL,
	`transfer_id` text NOT NULL,
	`volume` real NOT NULL,
	`created_batch_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`transfer_id`) REFERENCES `transfers`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transfer_destinations_batch_unique` ON `transfer_destinations` (`created_batch_id`);--> statement-breakpoint
CREATE TABLE `transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`cellar_id` text NOT NULL,
	`source_batch_id` text NOT NULL,
	`loss_volume` real NOT NULL,
	`target_phase` text NOT NULL,
	`performed_at` integer NOT NULL,
	`created_by` text NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`cellar_id`) REFERENCES `cellars`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`source_batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transfers_source_unique` ON `transfers` (`source_batch_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `wine_source_materials` (
	`id` text PRIMARY KEY NOT NULL,
	`wine_id` text NOT NULL,
	`grape_variety` text NOT NULL,
	`percentage` real NOT NULL,
	`weight_kg` real,
	`volume_liters` real,
	`harvest_sugar` real,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `source_materials_wine_idx` ON `wine_source_materials` (`wine_id`);--> statement-breakpoint
CREATE TABLE `wines` (
	`id` text PRIMARY KEY NOT NULL,
	`cellar_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`vintage_year` integer NOT NULL,
	`color` text NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`cellar_id`) REFERENCES `cellars`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wines_cellar_code_unique` ON `wines` (`cellar_id`,`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `wines_cellar_name_year_unique` ON `wines` (`cellar_id`,`name`,`vintage_year`);