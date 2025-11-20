import { create } from 'zustand';

/**
 * Global store for torrents data
 * This allows sharing torrent data across different pages
 */
export const useTorrentsStore = create((set) => ({
  torrents: [],
  setTorrents: (torrents) => set({ torrents }),
  getTorrentByHash: (hash) => {
    const state = useTorrentsStore.getState();
    if (!hash) return null;
    const normalizedHash = hash.toLowerCase();
    return state.torrents.find(
      (torrent) => torrent.hash?.toLowerCase() === normalizedHash,
    );
  },
}));

