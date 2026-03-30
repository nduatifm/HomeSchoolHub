-- AlterTable: add code column with temporary default for existing rows
ALTER TABLE "StudentInvite" ADD COLUMN "code" TEXT NOT NULL DEFAULT '';

-- Backfill existing rows with deterministically unique codes using row ID.
-- The code is derived from the SHA256 of the row id cast to text, which guarantees
-- uniqueness across existing rows (each id is unique, so each hash is unique).
-- We take 6 uppercase alphanumeric characters from the hex digest, remapping
-- hex characters 'a'-'f' to digits '1'-'6' so the alphabet stays [A-Z0-9].
UPDATE "StudentInvite"
SET "code" = UPPER(
  TRANSLATE(
    SUBSTRING(ENCODE(SHA256(id::text::bytea), 'hex'), 1, 6),
    'abcdef',
    '123456'
  )
)
WHERE "code" = '';

-- Remove the default so new rows must supply the value
ALTER TABLE "StudentInvite" ALTER COLUMN "code" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "StudentInvite_code_key" ON "StudentInvite"("code");

-- CreateIndex
CREATE INDEX "StudentInvite_code_idx" ON "StudentInvite"("code");
