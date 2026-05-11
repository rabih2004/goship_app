-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(30) NOT NULL,
    `email` VARCHAR(160) NOT NULL,
    `emailVerified` DATETIME(3) NULL,
    `name` VARCHAR(120) NULL,
    `passwordHash` VARCHAR(120) NULL,
    `role` ENUM('CUSTOMER', 'FORWARDER', 'ADMIN') NOT NULL DEFAULT 'CUSTOMER',
    `locale` VARCHAR(10) NOT NULL DEFAULT 'en',
    `suspended` BOOLEAN NOT NULL DEFAULT false,
    `image` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Account` (
    `id` VARCHAR(30) NOT NULL,
    `userId` VARCHAR(30) NOT NULL,
    `type` VARCHAR(30) NOT NULL,
    `provider` VARCHAR(60) NOT NULL,
    `providerAccountId` VARCHAR(120) NOT NULL,
    `refresh_token` TEXT NULL,
    `access_token` TEXT NULL,
    `expires_at` INTEGER NULL,
    `token_type` VARCHAR(30) NULL,
    `scope` VARCHAR(200) NULL,
    `id_token` TEXT NULL,
    `session_state` VARCHAR(200) NULL,

    UNIQUE INDEX `Account_provider_providerAccountId_key`(`provider`, `providerAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(30) NOT NULL,
    `sessionToken` VARCHAR(200) NOT NULL,
    `userId` VARCHAR(30) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Session_sessionToken_key`(`sessionToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VerificationToken` (
    `identifier` VARCHAR(100) NOT NULL,
    `token` VARCHAR(100) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VerificationToken_token_key`(`token`),
    UNIQUE INDEX `VerificationToken_identifier_token_key`(`identifier`, `token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ForwarderProfile` (
    `userId` VARCHAR(30) NOT NULL,
    `companyName` VARCHAR(120) NOT NULL,
    `registrationNumber` VARCHAR(80) NULL,
    `countryCode` VARCHAR(2) NOT NULL,
    `stripeAccountId` VARCHAR(80) NULL,
    `onboardingComplete` BOOLEAN NOT NULL DEFAULT false,
    `ratingAvg` DOUBLE NOT NULL DEFAULT 0,
    `ratingCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ForwarderProfile_stripeAccountId_key`(`stripeAccountId`),
    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lane` (
    `id` VARCHAR(30) NOT NULL,
    `forwarderId` VARCHAR(30) NOT NULL,
    `originPortUnlocode` VARCHAR(10) NOT NULL,
    `destinationPortUnlocode` VARCHAR(10) NOT NULL,
    `transitDays` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Lane_originPortUnlocode_destinationPortUnlocode_idx`(`originPortUnlocode`, `destinationPortUnlocode`),
    UNIQUE INDEX `Lane_forwarderId_originPortUnlocode_destinationPortUnlocode_key`(`forwarderId`, `originPortUnlocode`, `destinationPortUnlocode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Port` (
    `unlocode` VARCHAR(10) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `country` VARCHAR(2) NOT NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,

    INDEX `Port_country_idx`(`country`),
    INDEX `Port_name_idx`(`name`),
    PRIMARY KEY (`unlocode`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Shipment` (
    `id` VARCHAR(30) NOT NULL,
    `customerId` VARCHAR(30) NOT NULL,
    `originPortUnlocode` VARCHAR(10) NOT NULL,
    `destinationPortUnlocode` VARCHAR(10) NOT NULL,
    `containerType` ENUM('TWENTY_FT', 'FORTY_FT', 'FORTY_HC', 'LCL') NOT NULL,
    `cargoDescription` TEXT NOT NULL,
    `weightKg` INTEGER NOT NULL,
    `readyDate` DATETIME(3) NOT NULL,
    `incoterm` ENUM('FOB') NOT NULL DEFAULT 'FOB',
    `status` ENUM('DRAFT', 'RFQ_OPEN', 'BOOKED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'RFQ_OPEN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Shipment_status_idx`(`status`),
    INDEX `Shipment_originPortUnlocode_destinationPortUnlocode_idx`(`originPortUnlocode`, `destinationPortUnlocode`),
    INDEX `Shipment_customerId_idx`(`customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Quote` (
    `id` VARCHAR(30) NOT NULL,
    `shipmentId` VARCHAR(30) NOT NULL,
    `forwarderId` VARCHAR(30) NOT NULL,
    `priceUSDCents` INTEGER NOT NULL,
    `transitDays` INTEGER NOT NULL,
    `carrierName` VARCHAR(80) NOT NULL,
    `validUntil` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Quote_status_idx`(`status`),
    UNIQUE INDEX `Quote_shipmentId_forwarderId_key`(`shipmentId`, `forwarderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Booking` (
    `id` VARCHAR(30) NOT NULL,
    `shipmentId` VARCHAR(30) NOT NULL,
    `quoteId` VARCHAR(30) NOT NULL,
    `customerId` VARCHAR(30) NOT NULL,
    `forwarderId` VARCHAR(30) NOT NULL,
    `bookingNumber` VARCHAR(40) NOT NULL,
    `stripePaymentIntentId` VARCHAR(80) NULL,
    `stripeCheckoutId` VARCHAR(80) NULL,
    `totalUSDCents` INTEGER NOT NULL,
    `platformFeeUSDCents` INTEGER NOT NULL,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Booking_shipmentId_key`(`shipmentId`),
    UNIQUE INDEX `Booking_quoteId_key`(`quoteId`),
    UNIQUE INDEX `Booking_bookingNumber_key`(`bookingNumber`),
    UNIQUE INDEX `Booking_stripePaymentIntentId_key`(`stripePaymentIntentId`),
    UNIQUE INDEX `Booking_stripeCheckoutId_key`(`stripeCheckoutId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TrackingEvent` (
    `id` VARCHAR(30) NOT NULL,
    `bookingId` VARCHAR(30) NOT NULL,
    `stage` ENUM('BOOKED', 'LOADED', 'DEPARTED', 'ARRIVED', 'CLEARED', 'DELIVERED') NOT NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` TEXT NULL,
    `createdById` VARCHAR(30) NOT NULL,

    INDEX `TrackingEvent_bookingId_occurredAt_idx`(`bookingId`, `occurredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Document` (
    `id` VARCHAR(30) NOT NULL,
    `bookingId` VARCHAR(30) NOT NULL,
    `type` ENUM('BL', 'INVOICE', 'PACKING_LIST', 'OTHER') NOT NULL,
    `storageKey` VARCHAR(300) NOT NULL,
    `filename` VARCHAR(200) NOT NULL,
    `contentType` VARCHAR(80) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `uploadedById` VARCHAR(30) NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Document_bookingId_idx`(`bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FxRate` (
    `date` DATETIME(3) NOT NULL,
    `currency` VARCHAR(3) NOT NULL,
    `usdRate` DOUBLE NOT NULL,

    PRIMARY KEY (`date`, `currency`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ForwarderProfile` ADD CONSTRAINT `ForwarderProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lane` ADD CONSTRAINT `Lane_forwarderId_fkey` FOREIGN KEY (`forwarderId`) REFERENCES `ForwarderProfile`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lane` ADD CONSTRAINT `Lane_originPortUnlocode_fkey` FOREIGN KEY (`originPortUnlocode`) REFERENCES `Port`(`unlocode`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lane` ADD CONSTRAINT `Lane_destinationPortUnlocode_fkey` FOREIGN KEY (`destinationPortUnlocode`) REFERENCES `Port`(`unlocode`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_originPortUnlocode_fkey` FOREIGN KEY (`originPortUnlocode`) REFERENCES `Port`(`unlocode`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_destinationPortUnlocode_fkey` FOREIGN KEY (`destinationPortUnlocode`) REFERENCES `Port`(`unlocode`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_shipmentId_fkey` FOREIGN KEY (`shipmentId`) REFERENCES `Shipment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_forwarderId_fkey` FOREIGN KEY (`forwarderId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_shipmentId_fkey` FOREIGN KEY (`shipmentId`) REFERENCES `Shipment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_quoteId_fkey` FOREIGN KEY (`quoteId`) REFERENCES `Quote`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_forwarderId_fkey` FOREIGN KEY (`forwarderId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrackingEvent` ADD CONSTRAINT `TrackingEvent_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrackingEvent` ADD CONSTRAINT `TrackingEvent_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
