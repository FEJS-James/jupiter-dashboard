CREATE TABLE `comment_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`comment_id` integer NOT NULL,
	`previous_content` text NOT NULL,
	`edit_reason` text,
	`edited_by_agent_id` integer NOT NULL,
	`edited_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`edited_by_agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `comment_notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipient_agent_id` integer NOT NULL,
	`comment_id` integer NOT NULL,
	`task_id` integer NOT NULL,
	`type` text NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`read_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`recipient_agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `comment_reactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`comment_id` integer NOT NULL,
	`agent_id` integer NOT NULL,
	`reaction` text NOT NULL,
	`timestamp` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agent_id` integer NOT NULL,
	`notification_type` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`email_enabled` integer DEFAULT false NOT NULL,
	`push_enabled` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notification_preferences_agent_type_unique` ON `notification_preferences` (`agent_id`,`notification_type`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipient_id` integer NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`entity_type` text,
	`entity_id` integer,
	`related_entity_type` text,
	`related_entity_id` integer,
	`action_url` text,
	`metadata` text,
	`is_read` integer DEFAULT false NOT NULL,
	`read_at` integer,
	`priority` text DEFAULT 'normal' NOT NULL,
	`expires_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`recipient_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notifications_recipient_idx` ON `notifications` (`recipient_id`);--> statement-breakpoint
CREATE INDEX `notifications_type_idx` ON `notifications` (`type`);--> statement-breakpoint
CREATE INDEX `notifications_created_at_idx` ON `notifications` (`created_at`);--> statement-breakpoint
CREATE INDEX `notifications_is_read_idx` ON `notifications` (`is_read`);--> statement-breakpoint
CREATE INDEX `notifications_recipient_unread_idx` ON `notifications` (`recipient_id`,`is_read`);--> statement-breakpoint
CREATE INDEX `notifications_recipient_created_idx` ON `notifications` (`recipient_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `comments` ADD `parent_id` integer;--> statement-breakpoint
ALTER TABLE `comments` ADD `content_type` text DEFAULT 'plain' NOT NULL;--> statement-breakpoint
ALTER TABLE `comments` ADD `is_edited` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `comments` ADD `is_deleted` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `comments` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `comments` ADD `deleted_by_agent_id` integer REFERENCES agents(id);--> statement-breakpoint
ALTER TABLE `comments` ADD `mentions` text;--> statement-breakpoint
ALTER TABLE `comments` ADD `attachments` text;--> statement-breakpoint
ALTER TABLE `comments` ADD `metadata` text;--> statement-breakpoint
ALTER TABLE `comments` ADD `updated_at` integer DEFAULT (unixepoch()) NOT NULL;--> statement-breakpoint
CREATE INDEX `activity_timestamp_idx` ON `activity` (`timestamp`);--> statement-breakpoint
CREATE INDEX `activity_project_id_idx` ON `activity` (`project_id`);--> statement-breakpoint
CREATE INDEX `activity_agent_id_idx` ON `activity` (`agent_id`);--> statement-breakpoint
CREATE INDEX `activity_action_idx` ON `activity` (`action`);--> statement-breakpoint
CREATE INDEX `activity_timestamp_project_idx` ON `activity` (`timestamp`,`project_id`);