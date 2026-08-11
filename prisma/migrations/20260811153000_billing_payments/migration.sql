-- Billing fields + Payment table (idempotent for DBs that already received these via db push).

DO $$ BEGIN
  CREATE TYPE "Plan" AS ENUM ('FREE', 'BEGINNER', 'ADVANCED', 'PRO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PAID', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "plan" "Plan" NOT NULL DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS "planExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "razorpayCustomerId" TEXT,
  ADD COLUMN IF NOT EXISTS "razorpayOrderId" TEXT,
  ADD COLUMN IF NOT EXISTS "askLoopUsedThisMonth" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "askLoopMonthKey" TEXT,
  ADD COLUMN IF NOT EXISTS "reportsUsedThisMonth" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "reportsMonthKey" TEXT;

CREATE TABLE IF NOT EXISTS "Payment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "plan" "Plan" NOT NULL,
  "amountPaise" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
  "razorpayOrderId" TEXT NOT NULL,
  "razorpayPaymentId" TEXT,
  "razorpaySignature" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_razorpayOrderId_key" ON "Payment"("razorpayOrderId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_razorpayPaymentId_key" ON "Payment"("razorpayPaymentId");
CREATE INDEX IF NOT EXISTS "Payment_organizationId_createdAt_idx" ON "Payment"("organizationId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "Payment"
    ADD CONSTRAINT "Payment_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
