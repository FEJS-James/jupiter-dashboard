CREATE TABLE `domain_listings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`domain_id` integer NOT NULL,
	`platform` text NOT NULL,
	`listing_url` text,
	`asking_price` real,
	`min_offer_price` real,
	`listing_date` text,
	`status` text DEFAULT 'active' NOT NULL,
	`expires_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `domain_listings_domain_id_idx` ON `domain_listings` (`domain_id`);--> statement-breakpoint
CREATE INDEX `domain_listings_platform_idx` ON `domain_listings` (`platform`);--> statement-breakpoint
CREATE INDEX `domain_listings_status_idx` ON `domain_listings` (`status`);--> statement-breakpoint
CREATE TABLE `domain_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`domain_id` integer NOT NULL,
	`note` text NOT NULL,
	`author` text DEFAULT 'mars' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `domain_notes_domain_id_idx` ON `domain_notes` (`domain_id`);--> statement-breakpoint
CREATE TABLE `domain_offers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`domain_id` integer NOT NULL,
	`platform` text,
	`offer_amount` real NOT NULL,
	`buyer_name` text,
	`buyer_email` text,
	`counter_offer` real,
	`offer_date` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `domain_offers_domain_id_idx` ON `domain_offers` (`domain_id`);--> statement-breakpoint
CREATE INDEX `domain_offers_status_idx` ON `domain_offers` (`status`);--> statement-breakpoint
CREATE TABLE `domain_scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`domain_id` integer NOT NULL,
	`score` real NOT NULL,
	`score_breakdown` text NOT NULL,
	`scored_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `domain_scores_domain_id_idx` ON `domain_scores` (`domain_id`);--> statement-breakpoint
CREATE TABLE `domain_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`domain_id` integer NOT NULL,
	`type` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`date` text NOT NULL,
	`platform` text,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `domain_transactions_domain_id_idx` ON `domain_transactions` (`domain_id`);--> statement-breakpoint
CREATE INDEX `domain_transactions_type_idx` ON `domain_transactions` (`type`);--> statement-breakpoint
CREATE INDEX `domain_transactions_date_idx` ON `domain_transactions` (`date`);--> statement-breakpoint
CREATE TABLE `domains` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`domain_name` text NOT NULL,
	`tld` text NOT NULL,
	`status` text DEFAULT 'proposed' NOT NULL,
	`tier` integer,
	`score` real,
	`estimated_value` real,
	`registration_cost` real,
	`registrar` text,
	`purchase_date` text,
	`renewal_date` text,
	`renewal_cost` real,
	`dns_provider` text,
	`parking_status` text,
	`proposed_by` text DEFAULT 'mars',
	`proposed_date` text,
	`proposed_reasoning` text,
	`approved_by` text,
	`approved_date` text,
	`sale_price` real,
	`sale_date` text,
	`sale_platform` text,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `domains_domain_name_unique` ON `domains` (`domain_name`);--> statement-breakpoint
CREATE INDEX `domains_domain_name_idx` ON `domains` (`domain_name`);--> statement-breakpoint
CREATE INDEX `domains_status_idx` ON `domains` (`status`);--> statement-breakpoint
CREATE INDEX `domains_tld_idx` ON `domains` (`tld`);--> statement-breakpoint
CREATE INDEX `domains_tier_idx` ON `domains` (`tier`);--> statement-breakpoint
CREATE INDEX `domains_renewal_date_idx` ON `domains` (`renewal_date`);--> statement-breakpoint
CREATE INDEX `domains_proposed_date_idx` ON `domains` (`proposed_date`);