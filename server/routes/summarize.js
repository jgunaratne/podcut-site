import { Router } from 'express';
import { VertexAI } from '@google-cloud/vertexai';
import db from '../db.js';

export const summarizeRouter = Router();

const PROJECT_ID = process.env.VERTEX_PROJECT;
const LOCATION = process.env.VERTEX_LOCATION;
const MODEL = process.env.VERTEX_MODEL || 'gemini-2.5-flash';

const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
const model = vertexAI.getGenerativeModel({ model: MODEL });

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

summarizeRouter.post('/summarize', async (req, res) => {
  const { episodeId, text, segments, force } = req.body;
  if (!episodeId || !text) {
    return res.status(400).json({ error: 'episodeId and text required' });
  }

  // Check if summary already exists (skip if force regeneration)
  if (!force) {
    const existing = db.prepare('SELECT summary FROM transcriptions WHERE episode_id = ?').get(episodeId);
    if (existing?.summary) {
      return res.json({ summary: existing.summary });
    }
  }

  try {
    // Build timestamped transcript from segments if available
    let transcript;
    if (segments && segments.length > 0) {
      transcript = segments.map(seg => `[${formatTime(seg.start)}] ${seg.text}`).join('\n');
    } else {
      transcript = text.slice(0, 100000);
    }

    const prompt = `You are a podcast summarizer. Given the following timestamped podcast transcript, provide a clear, well-structured summary.

Include:
- A brief overview (2-3 sentences)
- Key topics discussed (as bullet points with timecodes in [M:SS] format referencing when each topic is discussed)
- Notable quotes or insights with their timecodes
- Key takeaways

IMPORTANT: Include timecodes in [M:SS] format in your bullet points to reference when topics are discussed. Use the timestamps from the transcript. For example: "- [2:15] Discussion about machine learning techniques"

Keep the summary concise but informative. Use markdown formatting.

TIMESTAMPED TRANSCRIPT:
${transcript.slice(0, 100000)}`;

    console.log(`Summarizing episode ${episodeId} (${transcript.length} chars)...`);

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
