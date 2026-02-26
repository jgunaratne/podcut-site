import { Router } from 'express';
import db from '../db.js';

export const favoritesRouter = Router();

favoritesRouter.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM favorites ORDER BY created_at DESC').all();
  const favorites = rows.map(row => ({
    collectionId: row.collection_id,
    collectionName: row.collection_name,
    artistName: row.artist_name,
    artworkUrl600: row.artwork_url,
    feedUrl: row.feed_url,
  }));
  res.json({ favorites });
});

favoritesRouter.post('/', (req, res) => {
  const { collectionId, collectionName, artistName, artworkUrl600, feedUrl } = req.body;
  if (!collectionId) return res.status(400).json({ error: 'collectionId required' });

  try {
    db.prepare(`
      INSERT OR IGNORE INTO favorites (collection_id, collection_name, artist_name, artwork_url, feed_url)
      VALUES (?, ?, ?, ?, ?)
    `).run(collectionId, collectionName, artistName, artworkUrl600, feedUrl);

    const rows = db.prepare('SELECT * FROM favorites ORDER BY created_at DESC').all();
    const favorites = rows.map(row => ({
      collectionId: row.collection_id,
      collectionName: row.collection_name,
      artistName: row.artist_name,
      artworkUrl600: row.artwork_url,
      feedUrl: row.feed_url,
    }));
    res.json({ message: 'Added', favorites });
  } catch (err) {
    console.error('Favorite add error:', err);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

favoritesRouter.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.prepare('DELETE FROM favorites WHERE collection_id = ?').run(id);

  const rows = db.prepare('SELECT * FROM favorites ORDER BY created_at DESC').all();
  const favorites = rows.map(row => ({
    collectionId: row.collection_id,
    collectionName: row.collection_name,
    artistName: row.artist_name,
    artworkUrl600: row.artwork_url,
    feedUrl: row.feed_url,
  }));
  res.json({ message: 'Removed', favorites });
});
