/*
  Warnings:

  - You are about to drop the `gas_sensor_data` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `gas_sensor_mappings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "gas_sensor_data";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "gas_sensor_mappings";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "press_stop_records" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "press_id" TEXT NOT NULL,
    "press_name" TEXT NOT NULL,
    "stopped_at" DATETIME NOT NULL,
    "reason" TEXT,
    "operator" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "press_stop_records_press_id_idx" ON "press_stop_records"("press_id");

-- CreateIndex
CREATE INDEX "press_stop_records_stopped_at_idx" ON "press_stop_records"("stopped_at");
