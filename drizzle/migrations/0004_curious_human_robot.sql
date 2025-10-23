ALTER TABLE `presences_event` ADD `eventType` integer NOT NULL DEFAULT 0;--> statement-breakpoint
UPDATE `presences_event` SET `eventType` = CASE 
	WHEN `event` = 'client-connected' THEN 1
	WHEN `event` = 'client-updated' THEN 2
	WHEN `event` = 'client-disconnected' THEN 3
	ELSE 1
END;--> statement-breakpoint
ALTER TABLE `presences_event` DROP COLUMN `event`;--> statement-breakpoint

PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_presences_event` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` integer NOT NULL,
	`clientId` integer NOT NULL,
	`eventType` integer NOT NULL,
	`fromWifiId` integer,
	`toWifiId` integer,
	FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`fromWifiId`) REFERENCES `wifis`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`toWifiId`) REFERENCES `wifis`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_presences_event`("id", "timestamp", "clientId", "eventType", "fromWifiId", "toWifiId") SELECT "id", "timestamp", "clientId", "eventType", "fromWifiId", "toWifiId" FROM `presences_event`;--> statement-breakpoint
DROP TABLE `presences_event`;--> statement-breakpoint
ALTER TABLE `__new_presences_event` RENAME TO `presences_event`;--> statement-breakpoint
PRAGMA foreign_keys=ON;

