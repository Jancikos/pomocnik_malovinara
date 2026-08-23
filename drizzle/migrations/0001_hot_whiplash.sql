CREATE TABLE `email_verification_tokens` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `email_verification_tokens_user_idx` ON `email_verification_tokens` (`user_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `username` text DEFAULT '' NOT NULL;--> statement-breakpoint
WITH ranked_users AS (
  SELECT
    `id`,
    lower(substr(`email`, 1, instr(`email`, '@') - 1)) AS base_username,
    row_number() OVER (PARTITION BY lower(substr(`email`, 1, instr(`email`, '@') - 1)) ORDER BY `id`) AS username_order
  FROM `users`
)
UPDATE `users`
SET `username` = (SELECT base_username || CASE WHEN username_order = 1 THEN '' ELSE '-' || username_order END FROM ranked_users WHERE ranked_users.id = users.id);--> statement-breakpoint
ALTER TABLE `users` ADD `email_verified_at` integer;--> statement-breakpoint
UPDATE `users` SET `email_verified_at` = unixepoch() * 1000;--> statement-breakpoint
ALTER TABLE `users` ADD `default_container_location` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);