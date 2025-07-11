'use client';

import { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConvert = async () => {
    if (!url) {
      setError('Please enter a SoundCloud URL');
      return;
    }

    setLoading(true);
    setError('');

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

      // Download the file
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = downloadUrl;
      a.download = 'soundcloud-audio.wav';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      setUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
          <button
            onClick={handleConvert}
            disabled={loading}
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
