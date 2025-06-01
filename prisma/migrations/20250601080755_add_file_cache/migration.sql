-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FileCache" (
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
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_FileCache" ("artist", "createdAt", "duration", "fileSize", "fileType", "groupName", "groupType", "id", "isTemporary", "lastUsedAt", "normalizedArtist", "normalizedTitle", "path", "rank", "sourceUrl", "thumbnailPath", "title", "updatedAt") SELECT "artist", "createdAt", "duration", "fileSize", "fileType", "groupName", "groupType", "id", "isTemporary", "lastUsedAt", "normalizedArtist", "normalizedTitle", "path", "rank", "sourceUrl", "thumbnailPath", "title", "updatedAt" FROM "FileCache";
DROP TABLE "FileCache";
ALTER TABLE "new_FileCache" RENAME TO "FileCache";
CREATE INDEX "FileCache_normalizedTitle_normalizedArtist_idx" ON "FileCache"("normalizedTitle", "normalizedArtist");
CREATE INDEX "FileCache_isTemporary_lastUsedAt_idx" ON "FileCache"("isTemporary", "lastUsedAt");
CREATE INDEX "FileCache_fileType_idx" ON "FileCache"("fileType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
