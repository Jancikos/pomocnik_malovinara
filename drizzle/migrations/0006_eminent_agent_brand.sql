CREATE TABLE `cellar_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`pivnica_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`pivnica_id`) REFERENCES `pivnice`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cellar_invitations_token_hash_unique` ON `cellar_invitations` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `cellar_invitation_email_unique` ON `cellar_invitations` (`pivnica_id`,`email`);--> statement-breakpoint
ALTER TABLE `pivnice` ADD `logo` text;--> statement-breakpoint
ALTER TABLE `pivnice` ADD `default_container_location` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `active_pivnica_id` text REFERENCES pivnice(id) ON DELETE SET NULL;--> statement-breakpoint
UPDATE pivnice SET default_container_location = COALESCE((SELECT users.default_container_location FROM pivnica_members JOIN users ON users.id = pivnica_members.user_id WHERE pivnica_members.pivnica_id = pivnice.id AND pivnica_members.role = 'OWNER' ORDER BY pivnica_members.created_at, users.id LIMIT 1), '');
