ALTER TABLE `routers` ADD `displayName` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `routers_displayName_unique` ON `routers` (`displayName`);--> statement-breakpoint
CREATE UNIQUE INDEX `routers_routerIP_unique` ON `routers` (`routerIP`);