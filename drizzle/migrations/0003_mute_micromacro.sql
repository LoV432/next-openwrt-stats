CREATE TABLE `clients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`clientName` text NOT NULL,
	`clientMacAddress` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clients_clientMacAddress_unique` ON `clients` (`clientMacAddress`);--> statement-breakpoint
CREATE TABLE `presences_event` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` integer NOT NULL,
	`clientId` integer NOT NULL,
	`event` text NOT NULL,
	`fromWifiId` integer,
	`toWifiId` integer,
	FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`fromWifiId`) REFERENCES `wifis`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`toWifiId`) REFERENCES `wifis`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `prev_clients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wifis` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`displayName` text NOT NULL,
	`ssid` text NOT NULL,
	`band` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wifis_displayName_ssid_band_unique` ON `wifis` (`displayName`,`ssid`,`band`);