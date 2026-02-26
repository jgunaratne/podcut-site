import { Router } from 'express';
import { VertexAI } from '@google-cloud/vertexai';
import db from '../db.js';

export const summarizeRouter = Router();

const PROJECT_ID = process.env.VERTEX_PROJECT;
const LOCATION = process.env.VERTEX_LOCATION;
const MODEL = process.env.VERTEX_MODEL || 'gemini-2.5-flash';

const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
const model = vertexAI.getGenerativeModel({ model: MODEL });

summarizeRouter.post('/summarize', async (req, res) => {
  const { episodeId, text } = req.body;
  if (!episodeId || !text) {
    return res.status(400).json({ error: 'episodeId and text required' });
  }

  // Check if summary already exists
  const existing = db.prepare('SELECT summary FROM transcriptions WHERE episode_id = ?').get(episodeId);
  if (existing?.summary) {
    return res.json({ summary: existing.summary });
  }

  try {
    const prompt = `You are a podcast summarizer. Given the following podcast episode transcript, provide a clear, well-structured summary.

Include:
- A brief overview (2-3 sentences)
- Key topics discussed (as bullet points)
- Notable quotes or insights (if any)
- Key takeaways

Keep the summary concise but informative. Use markdown formatting.

TRANSCRIPT:
${text.slice(0, 100000)}`;

    console.log(`Summarizing episode ${episodeId} (${text.length} chars)...`);

    const result = await model.generateContent(prompt);
    const response = result.response;
    const summary = response.candidates[0].content.parts[0].text;

    // Cache the summary in the database
    db.prepare('UPDATE transcriptions SET summary = ? WHERE episode_id = ?').run(summary, episodeId);

    console.log(`Summary generated for ${episodeId} (${summary.length} chars)`);
    res.json({ summary });
  } catch (err) {
    console.error('Summarization error:', err);
    res.status(500).json({ error: err.message || 'Summarization failed' });
  }
});
