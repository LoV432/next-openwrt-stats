CREATE TABLE `routers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`routerIP` text NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`session` text NOT NULL,
	`isPrimary` integer DEFAULT 0 NOT NULL
);
