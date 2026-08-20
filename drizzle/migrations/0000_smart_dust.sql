CREATE TABLE `sarze` (
	`id` text PRIMARY KEY NOT NULL,
	`pivnica_id` text NOT NULL,
	`vino_id` text NOT NULL,
	`faza` text NOT NULL,
	`nazov_nadoby` text NOT NULL,
	`typ_nadoby` text NOT NULL,
	`kapacita_nadoby` real NOT NULL,
	`umiestnenie_nadoby` text,
	`rodicovska_sarza_id` text,
	`volume` real NOT NULL,
	`status` text NOT NULL,
	`opened_at` integer NOT NULL,
	`closed_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`pivnica_id`) REFERENCES `pivnice`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`vino_id`) REFERENCES `vina`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`rodicovska_sarza_id`) REFERENCES `sarze`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `sarze_pivnica_status_idx` ON `sarze` (`pivnica_id`,`status`);--> statement-breakpoint
CREATE INDEX `sarze_vino_idx` ON `sarze` (`vino_id`);--> statement-breakpoint
CREATE INDEX `sarze_parent_idx` ON `sarze` (`rodicovska_sarza_id`);--> statement-breakpoint
CREATE INDEX `sarze_nazov_nadoby_idx` ON `sarze` (`pivnica_id`,`nazov_nadoby`);--> statement-breakpoint
CREATE UNIQUE INDEX `sarze_one_active_per_nazov_nadoby` ON `sarze` (`pivnica_id`,`nazov_nadoby`) WHERE "sarze"."status" = 'AKTIVNA';--> statement-breakpoint
CREATE TABLE `pivnica_members` (
	`pivnica_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'MEMBER' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`pivnica_id`, `user_id`),
	FOREIGN KEY (`pivnica_id`) REFERENCES `pivnice`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pivnice` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `zasahy` (
	`id` text PRIMARY KEY NOT NULL,
	`sarza_id` text NOT NULL,
	`type` text NOT NULL,
	`vykonane_at` integer NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`sarza_id`) REFERENCES `sarze`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `zasahy_sarza_date_idx` ON `zasahy` (`sarza_id`,`vykonane_at`);--> statement-breakpoint
CREATE TABLE `merania` (
	`id` text PRIMARY KEY NOT NULL,
	`sarza_id` text NOT NULL,
	`type` text NOT NULL,
	`value` real NOT NULL,
	`unit` text NOT NULL,
	`zmerane_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`sarza_id`) REFERENCES `sarze`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `merania_sarza_type_date_idx` ON `merania` (`sarza_id`,`type`,`zmerane_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `ciele_presunov` (
	`id` text PRIMARY KEY NOT NULL,
	`presun_id` text NOT NULL,
	`volume` real NOT NULL,
	`vytvorena_sarza_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`presun_id`) REFERENCES `presuny`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`vytvorena_sarza_id`) REFERENCES `sarze`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ciele_presunov_sarza_unique` ON `ciele_presunov` (`vytvorena_sarza_id`);--> statement-breakpoint
CREATE TABLE `presuny` (
	`id` text PRIMARY KEY NOT NULL,
	`pivnica_id` text NOT NULL,
	`zdrojova_sarza_id` text NOT NULL,
	`loss_volume` real NOT NULL,
	`cielova_faza` text NOT NULL,
	`vykonane_at` integer NOT NULL,
	`created_by` text NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`pivnica_id`) REFERENCES `pivnice`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`zdrojova_sarza_id`) REFERENCES `sarze`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `presuny_source_unique` ON `presuny` (`zdrojova_sarza_id`);--> statement-breakpoint
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
CREATE TABLE `vstupne_suroviny_vina` (
	`id` text PRIMARY KEY NOT NULL,
	`vino_id` text NOT NULL,
	`odroda_hrozna` text NOT NULL,
	`percentage` real NOT NULL,
	`weight_kg` real,
	`volume_liters` real,
	`cukornatost_pri_zbere` real,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`vino_id`) REFERENCES `vina`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `vstupne_suroviny_vino_idx` ON `vstupne_suroviny_vina` (`vino_id`);--> statement-breakpoint
CREATE TABLE `vina` (
	`id` text PRIMARY KEY NOT NULL,
	`pivnica_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`rocnik` integer NOT NULL,
	`color` text NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`pivnica_id`) REFERENCES `pivnice`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vina_pivnica_code_unique` ON `vina` (`pivnica_id`,`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `vina_pivnica_name_year_unique` ON `vina` (`pivnica_id`,`name`,`rocnik`);