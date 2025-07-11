'use client';

import { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trackInfo, setTrackInfo] = useState<{ 
    artist?: string; 
    title?: string; 
    duration?: number;
    thumbnail?: string;
  } | null>(null);
  const [fetchingInfo, setFetchingInfo] = useState(false);

  const fetchMetadata = async (url: string) => {
    setFetchingInfo(true);
    try {
      const response = await fetch('/api/metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      if (response.ok) {
        const metadata = await response.json();
        setTrackInfo(metadata);
      }
    } catch (error) {
      console.error('Failed to fetch metadata:', error);
    } finally {
      setFetchingInfo(false);
    }
  };

  const handleConvert = async () => {
    if (!url) {
      setError('Please enter a SoundCloud URL');
      return;
    }

    setLoading(true);
    setError('');
    
    // Fetch metadata first if not already fetched
    if (!trackInfo) {
      await fetchMetadata(url);
    }

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Conversion failed');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'soundcloud-audio.wav';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      // Download the file
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      setUrl('');
      setTrackInfo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setTrackInfo(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center">SoundCloud to WAV Converter</h1>
        
        <div className="w-full max-w-md mx-auto">
          <div className="mb-4">
            <input
              type="url"
              placeholder="Enter SoundCloud URL"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setTrackInfo(null);
              }}
              onBlur={() => {
                if (url && !trackInfo && !fetchingInfo) {
                  fetchMetadata(url);
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading || fetchingInfo}
            />
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
          {fetchingInfo && (
            <div className="mb-4 p-3 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
                <span>Getting track info...</span>
              </div>
            </div>
          )}
          
          {trackInfo && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-3">
                {trackInfo.thumbnail && (
                  <img 
                    src={trackInfo.thumbnail} 
                    alt="Track thumbnail" 
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">
                    {trackInfo.title || 'Unknown Title'}
                  </h3>
                  <p className="text-gray-600">
                    {trackInfo.artist || 'Unknown Artist'}
                  </p>
                  {trackInfo.duration && (
                    <p className="text-sm text-gray-500">
                      Duration: {Math.floor(trackInfo.duration / 60)}:{String(trackInfo.duration % 60).padStart(2, '0')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {loading && (
            <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                <span>Converting audio...</span>
              </div>
              <div className="mt-2 text-sm">
                Please wait while we download and convert your audio file.
              </div>
            </div>
          )}
          
          <button
            onClick={handleConvert}
            disabled={loading || fetchingInfo}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Converting...' : 'Convert to WAV'}
          </button>
          
          <div className="mt-8 text-sm text-gray-600">
            <p className="mb-2">Prerequisites:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>yt-dlp must be installed on the server</li>
              <li>Install with: <code className="bg-gray-100 px-1 py-0.5 rounded">brew install yt-dlp</code> (macOS)</li>
              <li>Or: <code className="bg-gray-100 px-1 py-0.5 rounded">pip install yt-dlp</code> (Python)</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
