-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "duration" INTEGER,
    "path" TEXT NOT NULL,
    "thumbnailPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "downloads" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Share" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shortCode" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "maxDownloads" INTEGER,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "password" TEXT NOT NULL,
    "excludeKeywords" TEXT,
    "storageLimit" INTEGER NOT NULL,
    "darkMode" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "DownloadQueue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "error" TEXT
);

-- CreateTable
CREATE TABLE "_FileToShare" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_FileToShare_A_fkey" FOREIGN KEY ("A") REFERENCES "File" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_FileToShare_B_fkey" FOREIGN KEY ("B") REFERENCES "Share" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Share_shortCode_key" ON "Share"("shortCode");

-- CreateIndex
CREATE UNIQUE INDEX "_FileToShare_AB_unique" ON "_FileToShare"("A", "B");

-- CreateIndex
CREATE INDEX "_FileToShare_B_index" ON "_FileToShare"("B");
