import { Router } from 'express';
import { XMLParser } from 'fast-xml-parser';

export const podcastRouter = Router();

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

podcastRouter.get('/:id', async (req, res) => {
  try {
    const { feedUrl } = req.query;
    if (!feedUrl) return res.status(400).json({ error: 'feedUrl required' });

    const response = await fetch(feedUrl);
    const xml = await response.text();
    const parsed = parser.parse(xml);

    const channel = parsed.rss?.channel;
    if (!channel) return res.status(404).json({ error: 'Invalid feed' });

    const items = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];

    const episodes = items.map((item, index) => {
      const enclosure = item.enclosure || {};
      return {
        id: `${req.params.id}-${index}`,
        title: item.title || 'Untitled',
        description: item.description || item['itunes:summary'] || '',
        pubDate: item.pubDate || '',
        duration: item['itunes:duration'] || '',
        audioUrl: enclosure['@_url'] || '',
        audioType: enclosure['@_type'] || 'audio/mpeg',
      };
    });

    const podcast = {
      collectionId: parseInt(req.params.id),
      title: channel.title || '',
      description: channel.description || '',
      author: channel['itunes:author'] || '',
      image: channel['itunes:image']?.['@_href'] || channel.image?.url || '',
      episodes,
    };

    res.json(podcast);
  } catch (err) {
    console.error('Podcast fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch podcast' });
  }
});
