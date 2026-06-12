-- CreateTable
CREATE TABLE "business_invitations" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "BusinessMemberRole" NOT NULL DEFAULT 'staff',
    "displayName" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "invitedByUserId" TEXT NOT NULL,

    CONSTRAINT "business_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_invitations_tokenHash_key" ON "business_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "business_invitations_businessId_idx" ON "business_invitations"("businessId");

-- CreateIndex
CREATE INDEX "business_invitations_email_idx" ON "business_invitations"("email");

-- CreateIndex
CREATE INDEX "business_invitations_expiresAt_idx" ON "business_invitations"("expiresAt");

-- AddForeignKey
ALTER TABLE "business_invitations" ADD CONSTRAINT "business_invitations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_invitations" ADD CONSTRAINT "business_invitations_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
