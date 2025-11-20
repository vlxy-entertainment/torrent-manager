'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ApiKeyInput from '@/components/downloads/ApiKeyInput';
import { useTorrentsStore } from '@/store/torrentsStore';
import { Inter } from 'next/font/google';
import Icons from '@/components/icons';
import Papa from 'papaparse';
import Spinner from '@/components/shared/Spinner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function CsvUploadPage() {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const { torrents, getTorrentByHash } = useTorrentsStore();

  useEffect(() => {
    const storedKey = localStorage.getItem('torboxApiKey');
    if (storedKey) {
      setApiKey(storedKey);
    }
    setLoading(false);
  }, []);

  const handleKeyChange = (newKey) => {
    setApiKey(newKey);
    localStorage.setItem('torboxApiKey', newKey);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleProcess = async () => {
    if (!file) {
      setError('Please select a CSV file');
      return;
    }

    if (!apiKey) {
      setError('Please enter your API key');
      return;
    }

    if (torrents.length === 0) {
      setError(
        'No torrents loaded. Please load torrents on the home page first.',
      );
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress({ current: 0, total: 0, message: 'Processing CSV...' });

    try {
      // Read CSV to get row count
      const csvText = await file.text();
      const parseResult = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });
      const totalRows = parseResult.data.length;

      setProgress({
        current: 0,
        total: totalRows,
        message: `Processing ${totalRows} rows...`,
      });

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('torrents', JSON.stringify(torrents));

      // Send to API
      const response = await fetch('/api/csv/process', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process CSV');
      }

      setResult(data);
      setProgress(null);
    } catch (err) {
      setError(err.message || 'Failed to process CSV');
      setProgress(null);
    } finally {
      setProcessing(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setProgress(null);
    // Reset file input
    const fileInput = document.getElementById('csv-file-input');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  if (loading) return null;

  return (
    <main
      className={`min-h-screen bg-surface dark:bg-surface-dark ${inter.variable} font-sans
                  text-primary-text dark:text-primary-text-dark`}
    >
      <Header />
      <div className="max-w-7xl mx-auto p-4">
        <ApiKeyInput
          value={apiKey}
          onKeyChange={handleKeyChange}
          allowKeyManager={true}
        />

        <div className="mt-8">
          <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Icons.Upload className="w-6 h-6" />
            CSV Upload - Video Processing Queue
          </h1>

          <div className="bg-surface-alt dark:bg-surface-alt-dark border border-border dark:border-border-dark rounded-lg p-6 mb-6">
            <p className="text-sm text-primary-text/70 dark:text-primary-text-dark/70 mb-4">
              Upload a CSV file to create video processing queue items. Each row
              will be processed to create a queue item in the video_processing_queue
              table.
            </p>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="csv-file-input"
                  className="block text-sm font-medium mb-2"
                >
                  CSV File
                </label>
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={processing}
                  className="w-full p-2 border border-border dark:border-border-dark rounded-lg
                    bg-transparent text-primary-text dark:text-primary-text-dark
                    focus:outline-none focus:ring-2 focus:ring-accent/20 dark:focus:ring-accent-dark/20
                    focus:border-accent dark:focus:border-accent-dark
                    transition-colors duration-200"
                />
                {file && (
                  <p className="text-sm text-primary-text/70 dark:text-primary-text-dark/70 mt-2">
                    Selected: {file.name}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleProcess}
                  disabled={!file || processing || !apiKey}
                  className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-md
                    transition-colors duration-200 flex items-center gap-2
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <>
                      <Spinner size="sm" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Icons.Upload className="w-4 h-4" />
                      Process CSV
                    </>
                  )}
                </button>
                <button
                  onClick={handleClear}
                  disabled={processing}
                  className="px-4 py-2 bg-surface dark:bg-surface-alt-dark border border-border dark:border-border-dark
                    hover:bg-surface-alt dark:hover:bg-surface-alt-dark rounded-md
                    transition-colors duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
                  {error}
                </div>
              )}

              {progress && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm mb-2">{progress.message}</p>
                  {progress.total > 0 && (
                    <div className="w-full bg-surface dark:bg-surface-dark rounded-full h-2">
                      <div
                        className="bg-accent h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(progress.current / progress.total) * 100}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {result && (
                <div className="mt-6">
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg mb-4">
                    <h3 className="text-lg font-semibold mb-2">
                      Processing Complete
                    </h3>
                    <p className="text-sm">
                      Successfully processed: {result.processed} / {result.total}{' '}
                      rows
                    </p>
                  </div>

                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">Errors/Warnings:</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {result.errors.map((err, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm"
                          >
                            <strong>Row {err.row}:</strong> {err.error || err.warning}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.results && result.results.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">
                        Successfully Created ({result.results.length}):
                      </h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {result.results.map((res, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg text-sm"
                          >
                            <strong>Row {res.row}:</strong> {res.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 p-4 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg">
                <h3 className="font-semibold mb-2">CSV Format Requirements:</h3>
                <ul className="text-sm space-y-1 text-primary-text/70 dark:text-primary-text-dark/70">
                  <li>
                    <strong>Required columns:</strong> title, hash, video_network,
                    release_date, actresses, thumbnail
                  </li>
                  <li>
                    <strong>title:</strong> Video title (required)
                  </li>
                  <li>
                    <strong>hash:</strong> Torrent hash ID (required) - used to find
                    torrent in the loaded torrent list
                  </li>
                  <li>
                    <strong>video_network:</strong> Network name
                  </li>
                  <li>
                    <strong>release_date:</strong> Release date (YYYY-MM-DD format)
                  </li>
                  <li>
                    <strong>actresses:</strong> Comma-separated actress names
                  </li>
                  <li>
                    <strong>thumbnail:</strong> Thumbnail URL (will be downloaded and
                    uploaded to image service)
                  </li>
                  <li>
                    <strong>magnet:</strong> Ignored (can be included but won't be
                    used)
                  </li>
                </ul>
                <p className="text-xs mt-2 text-primary-text/50 dark:text-primary-text-dark/50">
                  Note: Make sure torrents are loaded on the home page before
                  processing CSV. The hash field is used to match torrents from the
                  loaded list.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

