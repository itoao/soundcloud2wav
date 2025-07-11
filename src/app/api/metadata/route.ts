import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Type for request body
interface MetadataRequest {
  url: string;
}

// Type for track metadata
interface TrackMetadata {
  artist?: string;
  title?: string;
  duration?: number;
  description?: string;
  thumbnail?: string;
  uploader?: string;
  upload_date?: string;
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

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: MetadataRequest = await request.json();
    
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
    
    try {
      // Use yt-dlp to get metadata in JSON format
      const { stdout } = await execAsync(
        `yt-dlp --dump-json --no-download "${body.url}"`,
        { timeout: 30000 }
      );
      
      const metadata = JSON.parse(stdout);
      
      const trackInfo: TrackMetadata = {
        artist: metadata.uploader || metadata.artist || 'Unknown Artist',
        title: metadata.title || 'Unknown Title',
        duration: metadata.duration,
        description: metadata.description,
        thumbnail: metadata.thumbnail,
        uploader: metadata.uploader,
        upload_date: metadata.upload_date
      };
      
      return NextResponse.json(trackInfo);
      
    } catch (error) {
      console.error('yt-dlp metadata error:', error);
      
      // Check if yt-dlp is installed
      if (error instanceof Error && error.message.includes('yt-dlp')) {
        return NextResponse.json(
          { error: 'yt-dlp is not installed. Please install it using: brew install yt-dlp' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to get track metadata' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Metadata error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}