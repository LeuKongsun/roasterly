-- CreateTable
CREATE TABLE "roster_publications" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedByUserId" TEXT NOT NULL,

    CONSTRAINT "roster_publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roster_acknowledgements" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roster_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roster_publications_businessId_weekStart_key" ON "roster_publications"("businessId", "weekStart");

-- CreateIndex
CREATE INDEX "roster_publications_publishedByUserId_idx" ON "roster_publications"("publishedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "roster_acknowledgements_publicationId_memberId_key" ON "roster_acknowledgements"("publicationId", "memberId");

-- CreateIndex
CREATE INDEX "roster_acknowledgements_memberId_idx" ON "roster_acknowledgements"("memberId");

-- AddForeignKey
ALTER TABLE "roster_publications" ADD CONSTRAINT "roster_publications_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_publications" ADD CONSTRAINT "roster_publications_publishedByUserId_fkey" FOREIGN KEY ("publishedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_acknowledgements" ADD CONSTRAINT "roster_acknowledgements_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "roster_publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_acknowledgements" ADD CONSTRAINT "roster_acknowledgements_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "business_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
