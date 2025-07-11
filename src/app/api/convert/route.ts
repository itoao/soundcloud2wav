import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { unlink, createReadStream, stat } from 'fs';
import { promisify as promisifyFs } from 'util';
import path from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { nodeStreamToWebStream } from './stream-utils';

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
    
    // Generate temporary file path
    tempFilePath = generateTempFilename('wav');
    
    // Execute yt-dlp command
    const command = `yt-dlp -x --audio-format wav -o "${tempFilePath}" "${body.url}"`;
    
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
    
    // Create response with proper headers
    return new NextResponse(webStream, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Disposition': 'attachment; filename="soundcloud-audio.wav"',
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