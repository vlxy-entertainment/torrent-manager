'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ApiKeyInput from '@/components/downloads/ApiKeyInput';
import { extractMagnetHashes } from '@/utils/utility';
import Icons from '@/components/icons';

import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function ToolsPage() {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [magnetInput, setMagnetInput] = useState('');
  const [extractedHashes, setExtractedHashes] = useState([]);

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

  const handleExtractHashes = () => {
    if (!magnetInput.trim()) {
      setExtractedHashes([]);
      return;
    }

    const results = extractMagnetHashes(magnetInput);
    setExtractedHashes(results);
  };

  // Auto-extract when input changes (debounced)
  useEffect(() => {
    if (!magnetInput.trim()) {
      setExtractedHashes([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      const results = extractMagnetHashes(magnetInput);
      setExtractedHashes(results);
    }, 300); // Debounce for 300ms

    return () => clearTimeout(timeoutId);
  }, [magnetInput]);

  const handleCopyHash = async (hash) => {
    try {
      await navigator.clipboard.writeText(hash);
    } catch (err) {
      console.error('Failed to copy hash:', err);
    }
  };

  const handleCopyAllHashes = async () => {
    const allHashes = extractedHashes.map((item) => item.hash).join('\n');
    try {
      await navigator.clipboard.writeText(allHashes);
    } catch (err) {
      console.error('Failed to copy hashes:', err);
    }
  };

  const handleClear = () => {
    setMagnetInput('');
    setExtractedHashes([]);
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
          <h1 className="text-2xl font-bold mb-6">Tools</h1>

          {/* Magnet Hash Extractor Tool */}
          <div className="bg-surface-alt dark:bg-surface-alt-dark border border-border dark:border-border-dark rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Icons.Hash className="w-5 h-5" />
              Magnet Hash Extractor
            </h2>
            <p className="text-sm text-primary-text/70 dark:text-primary-text-dark/70 mb-4">
              Paste one or more magnet URLs (separated by line breaks) to extract
              their hash IDs.
            </p>

            <div className="space-y-4">
              <div>
                <textarea
                  value={magnetInput}
                  onChange={(e) => setMagnetInput(e.target.value)}
                  placeholder="magnet:?xt=urn:btih:d6dd2c47413f9cb94073e2126f5d0ea570941d93&dn=..."
                  className="w-full min-h-40 p-3 border border-border dark:border-border-dark rounded-lg 
                    bg-transparent text-primary-text dark:text-primary-text-dark 
                    placeholder-primary-text/50 dark:placeholder-primary-text-dark/50
                    focus:outline-none focus:ring-2 focus:ring-accent/20 dark:focus:ring-accent-dark/20 
                    focus:border-accent dark:focus:border-accent-dark
                    transition-colors duration-200 font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleExtractHashes}
                  className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-md
                    transition-colors duration-200 flex items-center gap-2"
                >
                  <Icons.MagnifyingGlass className="w-4 h-4" />
                  Extract Hashes
                </button>
                <button
                  onClick={handleClear}
                  className="px-4 py-2 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark
                    hover:bg-surface-alt dark:hover:bg-surface-alt-dark rounded-md
                    transition-colors duration-200"
                >
                  Clear
                </button>
              </div>

              {extractedHashes.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">
                      Extracted Hashes ({extractedHashes.length})
                    </h3>
                    <button
                      onClick={handleCopyAllHashes}
                      className="px-3 py-1.5 text-sm bg-surface dark:bg-surface-dark border border-border dark:border-border-dark
                        hover:bg-surface-alt dark:hover:bg-surface-alt-dark rounded-md
                        transition-colors duration-200 flex items-center gap-2"
                    >
                      <Icons.Copy className="w-4 h-4" />
                      Copy All
                    </button>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {extractedHashes.map((item, index) => (
                      <div
                        key={index}
                        className="p-3 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg
                          flex items-center justify-between gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm text-primary-text dark:text-primary-text-dark break-all">
                            {item.hash}
                          </div>
                          <div className="text-xs text-primary-text/50 dark:text-primary-text-dark/50 mt-1 truncate">
                            {item.url.substring(0, 80)}...
                          </div>
                        </div>
                        <button
                          onClick={() => handleCopyHash(item.hash)}
                          className="px-3 py-1.5 text-sm bg-surface-alt dark:bg-surface-alt-dark
                            hover:bg-surface-alt-hover dark:hover:bg-surface-alt-hover-dark rounded-md
                            transition-colors duration-200 flex items-center gap-2 shrink-0"
                          title="Copy hash"
                        >
                          <Icons.Copy className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {magnetInput.trim() && extractedHashes.length === 0 && (
                <div className="text-sm text-primary-text/70 dark:text-primary-text-dark/70 mt-4">
                  No valid magnet URLs found. Please check your input and try again.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

