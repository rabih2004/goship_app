-- DropIndex
DROP INDEX `Account_userId_fkey` ON `account`;

-- DropIndex
DROP INDEX `Booking_customerId_fkey` ON `booking`;

-- DropIndex
DROP INDEX `Booking_forwarderId_fkey` ON `booking`;

-- DropIndex
DROP INDEX `Document_uploadedById_fkey` ON `document`;

-- DropIndex
DROP INDEX `Lane_destinationPortUnlocode_fkey` ON `lane`;

-- DropIndex
DROP INDEX `Quote_forwarderId_fkey` ON `quote`;

-- DropIndex
DROP INDEX `Session_userId_fkey` ON `session`;

-- DropIndex
DROP INDEX `Shipment_destinationPortUnlocode_fkey` ON `shipment`;

-- DropIndex
DROP INDEX `TrackingEvent_createdById_fkey` ON `trackingevent`;

-- AlterTable
ALTER TABLE `user` MODIFY `role` ENUM('CUSTOMER', 'FORWARDER', 'COWORKER', 'ADMIN') NOT NULL DEFAULT 'CUSTOMER';

-- CreateTable
CREATE TABLE `CoworkerProfile` (
    `userId` VARCHAR(30) NOT NULL,
    `displayName` VARCHAR(120) NOT NULL,
    `countryCode` VARCHAR(2) NOT NULL,
    `cityArea` VARCHAR(120) NOT NULL,
    `serviceCenterLat` DOUBLE NULL,
    `serviceCenterLng` DOUBLE NULL,
    `serviceRadiusKm` INTEGER NOT NULL DEFAULT 50,
    `perKmRateUSDCents` INTEGER NOT NULL DEFAULT 100,
    `baseFeeUSDCents` INTEGER NOT NULL DEFAULT 2000,
    `vehicleType` VARCHAR(40) NOT NULL DEFAULT 'Van',
    `vehicleCapacityKg` INTEGER NOT NULL DEFAULT 1000,
    `stripeAccountId` VARCHAR(80) NULL,
    `onboardingComplete` BOOLEAN NOT NULL DEFAULT false,
    `ratingAvg` DOUBLE NOT NULL DEFAULT 0,
    `ratingCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CoworkerProfile_stripeAccountId_key`(`stripeAccountId`),
    INDEX `CoworkerProfile_countryCode_idx`(`countryCode`),
    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ForwarderProfile` ADD CONSTRAINT `ForwarderProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CoworkerProfile` ADD CONSTRAINT `CoworkerProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

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
