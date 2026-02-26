import { Router } from 'express';

export const searchRouter = Router();

searchRouter.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ results: [] });

    const url = `https://itunes.apple.com/search?media=podcast&term=${encodeURIComponent(q)}&limit=20`;
    const response = await fetch(url);
    const data = await response.json();

    const results = data.results.map(p => ({
      collectionId: p.collectionId,
      collectionName: p.collectionName,
      artistName: p.artistName,
      artworkUrl600: p.artworkUrl600,
      feedUrl: p.feedUrl,
      genres: p.genres || [],
      trackCount: p.trackCount,
    }));

    res.json({ results });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});
