-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DownloadQueue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "error" TEXT,
    "fileId" TEXT,
    CONSTRAINT "DownloadQueue_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DownloadQueue" ("createdAt", "error", "fileId", "id", "progress", "status", "type", "updatedAt", "url") SELECT "createdAt", "error", "fileId", "id", "progress", "status", "type", "updatedAt", "url" FROM "DownloadQueue";
DROP TABLE "DownloadQueue";
ALTER TABLE "new_DownloadQueue" RENAME TO "DownloadQueue";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
