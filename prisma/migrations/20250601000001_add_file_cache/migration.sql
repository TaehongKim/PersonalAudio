-- CreateTable
CREATE TABLE "FileCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "normalizedTitle" TEXT NOT NULL,
    "normalizedArtist" TEXT,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "duration" INTEGER,
    "path" TEXT NOT NULL,
    "thumbnailPath" TEXT,
    "sourceUrl" TEXT,
    "groupType" TEXT,
    "groupName" TEXT,
    "rank" INTEGER,
    "isTemporary" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "FileCache_normalizedTitle_normalizedArtist_idx" ON "FileCache"("normalizedTitle", "normalizedArtist");
CREATE INDEX "FileCache_isTemporary_lastUsedAt_idx" ON "FileCache"("isTemporary", "lastUsedAt");
CREATE INDEX "FileCache_fileType_idx" ON "FileCache"("fileType");