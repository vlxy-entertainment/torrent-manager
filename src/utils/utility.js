export const isQueuedItem = (item) =>
  !item.download_state && !item.download_finished && !item.active;

export const getAutoStartOptions = () => {
  const savedOptions = localStorage.getItem('torrent-upload-options');
  return savedOptions ? JSON.parse(savedOptions) : null;
};

export const sortItems = (items) =>
  items.sort((a, b) => new Date(b.added || 0) - new Date(a.added || 0));

/**
 * Extracts the hash ID from a magnet URL
 * @param {string} magnetUrl - The magnet URL (e.g., "magnet:?xt=urn:btih:d6dd2c47413f9cb94073e2126f5d0ea570941d93&dn=...")
 * @returns {string|null} - The hash ID or null if not found
 * @example
 * extractMagnetHash("magnet:?xt=urn:btih:d6dd2c47413f9cb94073e2126f5d0ea570941d93&dn=...")
 * // Returns: "d6dd2c47413f9cb94073e2126f5d0ea570941d93"
 */
export const extractMagnetHash = (magnetUrl) => {
  if (!magnetUrl || typeof magnetUrl !== 'string') {
    return null;
  }

  // Match the pattern: magnet:?xt=urn:btih:HASH_ID
  // The hash can be 32 or 40 characters (hex)
  // The {32,40} quantifier will match exactly 32-40 hex characters
  const match = magnetUrl.match(/magnet:\?xt=urn:btih:([a-fA-F0-9]{32,40})/i);
  
  if (match && match[1]) {
    return match[1].toLowerCase();
  }

  return null;
};

/**
 * Extracts hash IDs from multiple magnet URLs (separated by line breaks)
 * @param {string} input - Multiple magnet URLs separated by line breaks
 * @returns {Array<{hash: string, url: string}>} - Array of objects with hash and original URL
 */
export const extractMagnetHashes = (input) => {
  if (!input || typeof input !== 'string') {
    return [];
  }

  const lines = input.split('\n').map((line) => line.trim()).filter((line) => line);
  const results = [];

  for (const line of lines) {
    const hash = extractMagnetHash(line);
    if (hash) {
      results.push({ hash, url: line });
    }
  }

  return results;
};
