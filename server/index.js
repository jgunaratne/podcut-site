import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { searchRouter } from './routes/search.js';
import { podcastRouter } from './routes/podcast.js';
import { favoritesRouter } from './routes/favorites.js';
import { transcribeRouter } from './routes/transcribe.js';
import { summarizeRouter } from './routes/summarize.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/search', searchRouter);
app.use('/api/podcast', podcastRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api', transcribeRouter);
app.use('/api', summarizeRouter);

app.listen(PORT, () => {
  console.log(`PodCut server running on http://localhost:${PORT}`);
});
