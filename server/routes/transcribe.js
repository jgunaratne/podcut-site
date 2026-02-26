import { Router } from 'express';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import fs from 'fs';
import os from 'os';
import db from '../db.js';

export const transcribeRouter = Router();

const GPU_SERVER = process.env.GPU_SERVER || 'http://192.168.1.103';

transcribeRouter.post('/transcribe', async (req, res) => {
  const { audioUrl, episodeId, podcastId, episodeTitle } = req.body;
  if (!audioUrl || !episodeId) {
    return res.status(400).json({ error: 'audioUrl and episodeId required' });
  }

  // Check if transcription already exists in DB
  const existing = db.prepare('SELECT * FROM transcriptions WHERE episode_id = ?').get(episodeId);
  if (existing) {
    return res.json({
      text: existing.text,
      segments: JSON.parse(existing.segments || '[]'),
      language: existing.language,
      duration: existing.duration,
      processing_time: existing.processing_time,
    });
  }

  const tmpFile = os.tmpdir() + `/podcut-${episodeId}-${Date.now()}.mp3`;

  try {
    // Download audio
    console.log(`Downloading audio: ${audioUrl}`);
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) throw new Error(`Failed to download audio: ${audioResponse.status}`);

    await pipeline(audioResponse.body, createWriteStream(tmpFile));
    console.log(`Downloaded to ${tmpFile}`);

    // Read file as buffer and send via native FormData + Blob
    const fileBuffer = fs.readFileSync(tmpFile);
    const blob = new Blob([fileBuffer], { type: 'audio/mpeg' });
    const form = new FormData();
    form.append('file', blob, 'audio.mp3');

    console.log(`Sending to transcription server (${(fileBuffer.length / 1024 / 1024).toFixed(1)} MB)...`);

    // 30 minute timeout — GPU transcription can take a while, especially in a queue
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30 * 60 * 1000);

    const transcribeResponse = await fetch(`${GPU_SERVER}/api/transcribe`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!transcribeResponse.ok) {
      const errText = await transcribeResponse.text();
      throw new Error(`Transcription failed: ${transcribeResponse.status} - ${errText}`);
    }

    const result = await transcribeResponse.json();

    // Save transcription to SQLite
    db.prepare(`
      INSERT OR REPLACE INTO transcriptions (episode_id, podcast_id, episode_title, text, segments, language, duration, processing_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      episodeId,
      podcastId || null,
      episodeTitle || null,
      result.text,
      JSON.stringify(result.segments || []),
      result.language,
      result.duration,
      result.processing_time
    );

    res.json(result);
  } catch (err) {
    console.error('Transcription error:', err);
    res.status(500).json({ error: err.message || 'Transcription failed' });
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { }
  }
});

transcribeRouter.get('/transcriptions/:episodeId', (req, res) => {
  const row = db.prepare('SELECT * FROM transcriptions WHERE episode_id = ?').get(req.params.episodeId);
  if (!row) {
    return res.status(404).json({ error: 'No transcription found' });
  }
  res.json({
    text: row.text,
    segments: JSON.parse(row.segments || '[]'),
    language: row.language,
    duration: row.duration,
    processing_time: row.processing_time,
  });
});
