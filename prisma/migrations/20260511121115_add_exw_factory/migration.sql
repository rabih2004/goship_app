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
ALTER TABLE `shipment` ADD COLUMN `factoryAddressLine` VARCHAR(300) NULL,
    ADD COLUMN `factoryCity` VARCHAR(120) NULL,
    ADD COLUMN `factoryLat` DOUBLE NULL,
    ADD COLUMN `factoryLng` DOUBLE NULL,
    ADD COLUMN `pickupContactName` VARCHAR(120) NULL,
    ADD COLUMN `pickupContactPhone` VARCHAR(40) NULL,
    MODIFY `incoterm` ENUM('FOB', 'EXW') NOT NULL DEFAULT 'FOB';

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
