# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Starting the Application
```bash
# Development server (custom Node.js server with Socket.io)
pnpm dev

# Alternative: Next.js dev server only (no Socket.io)
pnpm dev:next

# Production server
pnpm start
```

### Database Operations
```bash
# Generate Prisma client
pnpm prisma generate

# Create and apply migrations
pnpm prisma migrate dev --name <migration-name>

# Reset database
pnpm prisma migrate reset

# View database in browser
pnpm prisma studio
```

### Build & Lint
```bash
# Build for production
pnpm build

# Lint code
pnpm lint
```

## Architecture Overview

### Custom Server Architecture
This project uses a **custom Node.js server** (`server.ts`) instead of standard Next.js server to integrate Socket.io for real-time download progress updates. The server:
- Serves Next.js app through custom HTTP server
- Initializes Socket.io on the same port
- Ensures required binaries (yt-dlp, ffmpeg) are available
- Creates storage directories on startup

### Database Architecture (SQLite + Prisma)
**Models:**
- `File`: Downloaded media files with metadata
- `Share`: Shareable links with expiration and download limits  
- `Settings`: App configuration (password, storage limits, theme)
- `DownloadQueue`: Background download job queue with status tracking

### Download System Architecture
**Queue Management:**
- Maximum 2 concurrent downloads (`MAX_CONCURRENT_DOWNLOADS`)
- Queue processing in `lib/queue-manager.ts`
- Status tracking: `pending` → `processing` → `completed`/`failed`

**Download Types:**
- Single YouTube MP3/Video download
- Playlist MP3/Video download with individual item progress
- Real-time progress updates via Socket.io

**Binary Dependencies:**
- `yt-dlp`: YouTube video/audio extraction
- `ffmpeg`: Audio conversion and processing
- Auto-installation via `lib/utils/binary-installer.ts`

### Authentication System
**NextAuth Configuration:**
- Credentials provider with bcrypt password hashing
- Single admin user authentication
- Default password: "1" (should be changed in production)
- JWT sessions with 30-day expiration

**Route Protection:**
- Middleware protects all routes except `/`, `/api/auth/*`, `/share/*`
- Authentication state managed in localStorage
- Share links accessible without authentication

### Real-time Features (Socket.io)
**Events:**
- `download:status`: Progress percentage updates
- `download:complete`: Download completion with file info
- `download:error`: Error notifications
- `playlist:item-progress`: Individual playlist item progress
- `playlist:item-complete`: Playlist item completion

**Room Management:**
- Clients subscribe to download IDs as rooms
- Automatic cleanup on disconnect

### UI Architecture
**Component Structure:**
- Single-page app with tab-based navigation
- Responsive design: Desktop sidebar + Mobile bottom navigation
- Dark/light theme support via React Context

**Key Components:**
- `DownloadForm`: YouTube URL input and download initiation
- `DownloadStatus`: Real-time progress display
- `FilesManager`: Downloaded files browser with player
- `SharesManager`: Share link creation and management
- `PlayerControls`: Audio/video playback controls

**State Management:**
- React Context for theme management
- localStorage for authentication state
- Custom hooks for Socket.io connection management

## File Structure Conventions

### API Routes (`app/api/`)
- `auth/`: NextAuth authentication endpoints
- `youtube/`: Download management (download, queue, status, cancel)

### Components (`components/`)
- UI components use shadcn/ui library
- Custom components for app-specific functionality
- Responsive design with Tailwind CSS

### Libraries (`lib/`)
- `downloader.ts`: Core download functionality with yt-dlp
- `queue-manager.ts`: Download queue management
- `socket-server.ts`: Socket.io server initialization
- `prisma.ts`: Database client configuration
- `auth.ts`: Authentication utilities

### Storage
- Default: `./storage` directory for downloaded files
- Configurable via `MEDIA_STORAGE_PATH` environment variable
- Organized by timestamp and playlist folders

## Development Guidelines

### Working with Downloads
- All download operations go through the queue system
- Always update download status via Socket.io events
- Handle both single files and playlist downloads
- Support MP3 and 720p video formats

### Database Changes
- Use Prisma migrations for schema changes
- Test with `prisma studio` for data inspection
- SQLite database located at `prisma/dev.db`

### Socket.io Development
- Test real-time features with multiple browser tabs
- Check browser console for Socket.io connection status
- Use browser dev tools Network tab to monitor Socket.io events

### Binary Dependencies
- Development environment may work without yt-dlp/ffmpeg (dummy implementations)
- Production requires actual binaries for real downloads
- Binary installation handled automatically on server startup