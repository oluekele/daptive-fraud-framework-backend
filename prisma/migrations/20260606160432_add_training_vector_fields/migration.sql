-- AlterTable
ALTER TABLE "Feature" ADD COLUMN     "avgScrollSpeed" DOUBLE PRECISION,
ADD COLUMN     "clickRate" DOUBLE PRECISION,
ADD COLUMN     "durationSeconds" DOUBLE PRECISION,
ADD COLUMN     "eventRate" DOUBLE PRECISION,
ADD COLUMN     "idleTimeSeconds" DOUBLE PRECISION,
ADD COLUMN     "keyboardEvents" DOUBLE PRECISION,
ADD COLUMN     "keystrokesPerSecond" DOUBLE PRECISION,
ADD COLUMN     "maxMouseSpeed" DOUBLE PRECISION,
ADD COLUMN     "mouseClicks" DOUBLE PRECISION,
ADD COLUMN     "mouseDistance" DOUBLE PRECISION,
ADD COLUMN     "mouseMoves" DOUBLE PRECISION,
ADD COLUMN     "scrollDepth" DOUBLE PRECISION,
ADD COLUMN     "scrollDirectionChanges" DOUBLE PRECISION,
ADD COLUMN     "scrollEvents" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "label" TEXT;
