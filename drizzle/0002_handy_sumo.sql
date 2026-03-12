CREATE TABLE `preference_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text,
	`icon` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `preference_categories_name_unique` ON `preference_categories` (`name`);--> statement-breakpoint
CREATE TABLE `preference_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_preference_id` integer NOT NULL,
	`field_name` text NOT NULL,
	`previous_value` text,
	`new_value` text,
	`changed_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_preference_id`) REFERENCES `user_preferences`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `preference_history_user_preference_id_idx` ON `preference_history` (`user_preference_id`);--> statement-breakpoint
CREATE INDEX `preference_history_changed_at_idx` ON `preference_history` (`changed_at`);--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agent_id` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`default_landing_page` text DEFAULT 'dashboard' NOT NULL,
	`default_task_view` text DEFAULT 'kanban' NOT NULL,
	`tasks_per_page` integer DEFAULT 20 NOT NULL,
	`sidebar_collapsed` integer DEFAULT false NOT NULL,
	`kanban_columns_visible` text DEFAULT '["backlog", "in-progress", "code-review", "testing", "deploying", "done"]',
	`kanban_column_order` text DEFAULT '["backlog", "in-progress", "code-review", "testing", "deploying", "done"]',
	`default_date_range` text DEFAULT 'month' NOT NULL,
	`font_size` text DEFAULT 'medium' NOT NULL,
	`interface_density` text DEFAULT 'comfortable' NOT NULL,
	`accent_color` text DEFAULT '#3b82f6' NOT NULL,
	`custom_theme_variant` text,
	`reduced_motion` integer DEFAULT false NOT NULL,
	`locale` text DEFAULT 'en' NOT NULL,
	`screen_reader_optimized` integer DEFAULT false NOT NULL,
	`high_contrast_mode` integer DEFAULT false NOT NULL,
	`keyboard_navigation_enabled` integer DEFAULT true NOT NULL,
	`focus_indicator_enhanced` integer DEFAULT false NOT NULL,
	`text_scaling` real DEFAULT 1 NOT NULL,
	`audio_feedback_enabled` integer DEFAULT false NOT NULL,
	`default_task_priority` text DEFAULT 'medium' NOT NULL,
	`default_project_id` integer,
	`auto_save_enabled` integer DEFAULT true NOT NULL,
	`quick_action_buttons` text DEFAULT '["create-task", "assign-task", "change-status"]',
	`default_export_format` text DEFAULT 'json' NOT NULL,
	`notification_frequency` text DEFAULT 'immediate' NOT NULL,
	`quiet_hours_start` text DEFAULT '22:00',
	`quiet_hours_end` text DEFAULT '08:00',
	`quiet_hours_enabled` integer DEFAULT false NOT NULL,
	`keyboard_shortcuts` text DEFAULT '{}',
	`analytics_preferences` text DEFAULT '{}',
	`export_preferences` text DEFAULT '{}',
	`custom_settings` text DEFAULT '{}',
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`default_project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `user_preferences_agent_id_unique` ON `user_preferences` (`agent_id`);--> statement-breakpoint
CREATE INDEX `user_preferences_version_idx` ON `user_preferences` (`version`);--> statement-breakpoint
CREATE INDEX `notifications_expires_at_idx` ON `notifications` (`expires_at`);--> statement-breakpoint
CREATE INDEX `notifications_recipient_type_idx` ON `notifications` (`recipient_id`,`type`);