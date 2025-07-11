# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Development Server
```bash
npm run dev
```
The app will be available at http://localhost:3000 with Turbopack for fast refresh.

### Building for Production
```bash
npm run build
```

### Running Production Build
```bash
npm run start
```

### Linting
```bash
npm run lint
```

## High-Level Architecture

This is a Next.js 15 application using the App Router that provides a web interface for converting SoundCloud audio tracks to WAV format.

### Core Components

1. **Frontend (src/app/page.tsx)**
   - Client-side React component with URL input and download functionality
   - Handles user interaction, error states, and file download
   - Makes POST request to `/api/convert` endpoint

2. **API Layer (src/app/api/convert/route.ts)**
   - Validates SoundCloud URLs
   - Executes yt-dlp command-line tool for audio extraction
   - Streams converted WAV file back to client
   - Handles temporary file management and cleanup
   - Environment-based configuration for timeouts and file size limits

3. **Stream Utilities (src/app/api/convert/stream-utils.ts)**
   - Converts Node.js streams to Web streams for Next.js compatibility
   - Critical for streaming large audio files efficiently

4. **Type Definitions (src/types/index.ts)**
   - Shared TypeScript interfaces for API request/response types

### External Dependencies

The application requires these command-line tools to be installed:
- **yt-dlp**: For downloading audio from SoundCloud
- **ffmpeg**: Used by yt-dlp for audio format conversion

### Key Technical Details

- Uses TypeScript with strict mode enabled
- Tailwind CSS v4 for styling
- Path aliases configured: `@/*` maps to `./src/*`
- Temporary files are created in system temp directory and cleaned up automatically
- No test framework currently configured