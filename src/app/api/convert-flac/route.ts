import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { unlink, createReadStream, stat } from 'fs';
import { promisify as promisifyFs } from 'util';
import path from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { nodeStreamToWebStream } from '../convert/stream-utils';

const execAsync = promisify(exec);
const unlinkAsync = promisifyFs(unlink);
const statAsync = promisifyFs(stat);

// Configuration from environment variables
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10);
const CONVERSION_TIMEOUT_MS = parseInt(process.env.CONVERSION_TIMEOUT_MS || '300000', 10);

// Type for request body
interface ConvertRequest {
  url: string;
}

// Type for track metadata
interface TrackMetadata {
  artist?: string;
  title?: string;
  filename: string;
}

// Validate SoundCloud URL
function isValidSoundCloudUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'soundcloud.com' || urlObj.hostname === 'www.soundcloud.com';
  } catch {
    return false;
  }
}

// Generate unique filename
function generateTempFilename(extension: string): string {
  const uniqueId = randomBytes(16).toString('hex');
  return path.join(tmpdir(), `soundcloud-${uniqueId}.${extension}`);
}

// Get track metadata using yt-dlp
async function getTrackMetadata(url: string): Promise<TrackMetadata> {
  try {
    // Use yt-dlp to get metadata in JSON format
    const { stdout } = await execAsync(
      `yt-dlp --dump-json --no-download "${url}"`,
      { timeout: 30000 }
    );
    
    const metadata = JSON.parse(stdout);
    const artist = metadata.uploader || metadata.artist || 'Unknown Artist';
    const title = metadata.title || 'Unknown Title';
    
    // Clean filename for safe file system usage
    const cleanFilename = `${artist} - ${title}`.replace(/[<>:"/\\|?*]/g, '_');
    
    return {
      artist,
      title,
      filename: cleanFilename
    };
  } catch (error) {
    console.error('Failed to get metadata:', error);
    return {
      filename: 'soundcloud-audio'
    };
  }
}

// Sanitize filename for safe download
function sanitizeFilename(filename: string): string {
  // Remove or replace characters that might cause issues
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\.+/g, '.')
    .replace(/^\s+|\s+$/g, '')
    .slice(0, 200); // Limit length
}

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;
  
  try {
    // Parse request body
    const body: ConvertRequest = await request.json();
    
    // Validate URL
    if (!body.url || typeof body.url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }
    
    if (!isValidSoundCloudUrl(body.url)) {
      return NextResponse.json(
        { error: 'Invalid SoundCloud URL' },
        { status: 400 }
      );
    }
    
    // Get track metadata first
    const metadata = await getTrackMetadata(body.url);
    
    // Generate temporary file path
    tempFilePath = generateTempFilename('flac');
    
    // Execute yt-dlp command with metadata and thumbnail embedding for FLAC
    const command = `yt-dlp -x --audio-format flac -o "${tempFilePath}" --add-metadata --embed-thumbnail "${body.url}"`;
    
    try {
      await execAsync(command, {
        timeout: CONVERSION_TIMEOUT_MS,
        maxBuffer: 1024 * 1024 * MAX_FILE_SIZE_MB
      });
    } catch (error) {
      console.error('yt-dlp execution error:', error);
      
      // Check if yt-dlp is installed
      if (error instanceof Error && error.message.includes('yt-dlp')) {
        return NextResponse.json(
          { error: 'yt-dlp is not installed. Please install it using: brew install yt-dlp' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to download and convert audio' },
        { status: 500 }
      );
    }
    
    // Check if file was created
    try {
      const fileStats = await statAsync(tempFilePath);
      if (fileStats.size === 0) {
        throw new Error('Downloaded file is empty');
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to create audio file' },
        { status: 500 }
      );
    }
    
    // Read the file and create response
    const fileStream = createReadStream(tempFilePath);
    
    // Convert Node.js stream to Web stream
    const webStream = nodeStreamToWebStream(fileStream);
    
    // Clean up temp file after stream is finished
    fileStream.on('end', async () => {
      if (tempFilePath) {
        try {
          await unlinkAsync(tempFilePath);
        } catch (error) {
          console.error('Failed to clean up temp file:', error);
        }
      }
    });
    
    // Handle stream errors
    fileStream.on('error', async (error) => {
      console.error('File stream error:', error);
      if (tempFilePath) {
        try {
          await unlinkAsync(tempFilePath);
        } catch {
          // Ignore cleanup errors
        }
      }
    });
    
    // Create response with proper headers and metadata filename
    const safeFilename = sanitizeFilename(metadata.filename);
    return new NextResponse(webStream, {
      headers: {
        'Content-Type': 'audio/flac',
        'Content-Disposition': `attachment; filename="${safeFilename}.flac"`,
      },
    });
    
  } catch (error) {
    console.error('Conversion error:', error);
    
    // Clean up temp file if it exists
    if (tempFilePath) {
      try {
        await unlinkAsync(tempFilePath);
      } catch {
        // Ignore cleanup errors
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optional: Add OPTIONS handler for CORS if needed
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}