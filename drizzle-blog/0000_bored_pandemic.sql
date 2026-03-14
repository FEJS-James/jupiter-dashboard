CREATE TABLE `affiliate_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`article_id` integer NOT NULL,
	`platform` text NOT NULL,
	`product_name` text NOT NULL,
	`affiliate_url` text NOT NULL,
	`clicks` integer DEFAULT 0 NOT NULL,
	`conversions` integer DEFAULT 0 NOT NULL,
	`revenue` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `article_performance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`article_id` integer NOT NULL,
	`date` text NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`unique_visitors` integer DEFAULT 0 NOT NULL,
	`avg_time_on_page` real,
	`bounce_rate` real,
	`ctr` real,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `articles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`blog_id` integer NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`content` text,
	`hero_image` text,
	`author` text DEFAULT 'Mars' NOT NULL,
	`excerpt` text,
	`meta_description` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`publish_date` integer,
	`has_affiliate_links` integer DEFAULT 0 NOT NULL,
	`affiliate_tag` text,
	`tags` text,
	`word_count` integer,
	`reading_time_minutes` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`blog_id`) REFERENCES `blogs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_articles_blog_status` ON `articles` (`blog_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_articles_blog_published` ON `articles` (`blog_id`,`publish_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_articles_slug` ON `articles` (`blog_id`,`slug`);--> statement-breakpoint
CREATE TABLE `blogs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`theme_config` text,
	`domain` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blogs_slug_unique` ON `blogs` (`slug`);--> statement-breakpoint
CREATE TABLE `content_pipeline` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`blog_id` integer NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'idea' NOT NULL,
	`target_date` integer,
	`keywords` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`blog_id`) REFERENCES `blogs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `optimization_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`article_id` integer NOT NULL,
	`optimization_type` text NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `revenue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`blog_id` integer NOT NULL,
	`date` text NOT NULL,
	`source` text NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`notes` text,
	FOREIGN KEY (`blog_id`) REFERENCES `blogs`(`id`) ON UPDATE no action ON DELETE cascade
);
