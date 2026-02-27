import { Router } from 'express';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import fs from 'fs';
import os from 'os';
import path from 'path';
import db from '../db.js';

export const transcribeRouter = Router();

const GPU_SERVER = process.env.GPU_SERVER;

// Map content types to file extensions and MIME types
const AUDIO_TYPES = {
  'audio/mpeg': { ext: '.mp3', mime: 'audio/mpeg' },
  'audio/mp3': { ext: '.mp3', mime: 'audio/mpeg' },
  'audio/mp4': { ext: '.m4a', mime: 'audio/mp4' },
  'audio/x-m4a': { ext: '.m4a', mime: 'audio/mp4' },
  'audio/aac': { ext: '.aac', mime: 'audio/aac' },
  'audio/ogg': { ext: '.ogg', mime: 'audio/ogg' },
  'audio/wav': { ext: '.wav', mime: 'audio/wav' },
};

// Background transcription processor — fire and forget
async function processTranscription(audioUrl, episodeId, podcastId, episodeTitle) {
  let tmpFile = null;

  try {
    // Download audio with User-Agent and timeout
    console.log(`[${episodeId}] Downloading: ${audioUrl}`);

    const dlController = new AbortController();
    const dlTimeout = setTimeout(() => dlController.abort(), 15 * 60 * 1000); // 15 min download timeout

    const audioResponse = await fetch(audioUrl, {
      signal: dlController.signal,
      headers: {
        'User-Agent': 'PodCut/1.0 (Podcast Transcription Service)',
      },
      redirect: 'follow',
    });

    if (!audioResponse.ok) {
      clearTimeout(dlTimeout);
      throw new Error(`Download failed: HTTP ${audioResponse.status} ${audioResponse.statusText}`);
    }

    // Detect audio type from Content-Type header or URL
    const contentType = (audioResponse.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const urlExt = path.extname(new URL(audioUrl.split('?')[0]).pathname).toLowerCase();
    const audioInfo = AUDIO_TYPES[contentType] || AUDIO_TYPES['audio/mpeg'];
    const ext = audioInfo.ext || urlExt || '.mp3';

    tmpFile = os.tmpdir() + `/podcut-${episodeId}-${Date.now()}${ext}`;

    // Stream download to disk — timeout covers the entire download, not just headers
    await pipeline(audioResponse.body, createWriteStream(tmpFile));
    clearTimeout(dlTimeout);

    const fileSize = fs.statSync(tmpFile).size;
    console.log(`[${episodeId}] Downloaded ${(fileSize / 1024 / 1024).toFixed(1)} MB (${contentType || 'unknown type'})`);

    if (fileSize < 1000) {
      throw new Error(`Downloaded file too small (${fileSize} bytes) — may not be a valid audio file`);
    }

    // Stream file to GPU server without reading entire file into memory
    const fileBlob = await fs.openAsBlob(tmpFile, { type: audioInfo.mime });
    const form = new FormData();
    form.append('file', fileBlob, `audio${ext}`);

    console.log(`[${episodeId}] Sending to GPU server...`);

    // 30 minute timeout — GPU transcription can take a while
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
      throw new Error(`GPU server error: ${transcribeResponse.status} - ${errText}`);
    }

    const result = await transcribeResponse.json();

    // Update row to completed with results
    db.prepare(`
      UPDATE transcriptions
      SET text = ?, segments = ?, language = ?, duration = ?, processing_time = ?, status = 'completed', error = NULL
      WHERE episode_id = ?
    `).run(
      result.text,
      JSON.stringify(result.segments || []),
      result.language,
      result.duration,
      result.processing_time,
      episodeId
    );

    console.log(`[${episodeId}] Transcription saved (${result.duration?.toFixed(0)}s audio, ${result.processing_time?.toFixed(1)}s processing)`);
  } catch (err) {
    console.error(`[${episodeId}] Transcription error:`, err.message);
    // Update row to failed with error message
    db.prepare(`
      UPDATE transcriptions SET status = 'failed', error = ? WHERE episode_id = ?
    `).run(err.message || 'Transcription failed', episodeId);
  } finally {
    if (tmpFile) {
      try { fs.unlinkSync(tmpFile); } catch { }
    }
  }
}

transcribeRouter.post('/transcribe', async (req, res) => {
  const { audioUrl, episodeId, podcastId, episodeTitle } = req.body;
  if (!audioUrl || !episodeId) {
    return res.status(400).json({ error: 'audioUrl and episodeId required' });
  }

  // Check if transcription already exists in DB
  const existing = db.prepare('SELECT * FROM transcriptions WHERE episode_id = ?').get(episodeId);
  if (existing) {
    if (existing.status === 'completed') {
      return res.json({
        status: 'completed',
        text: existing.text,
        segments: JSON.parse(existing.segments || '[]'),
        language: existing.language,
        duration: existing.duration,
        processing_time: existing.processing_time,
      });
    }
    if (existing.status === 'processing') {
      return res.status(202).json({ status: 'processing', episodeId });
    }
    // If failed, delete old row so we can retry
    db.prepare('DELETE FROM transcriptions WHERE episode_id = ?').run(episodeId);
  }

  // Insert a processing placeholder row
  db.prepare(`
    INSERT INTO transcriptions (episode_id, podcast_id, episode_title, status)
    VALUES (?, ?, ?, 'processing')
  `).run(episodeId, podcastId || null, episodeTitle || null);

  // Fire and forget — process in background
  processTranscription(audioUrl, episodeId, podcastId, episodeTitle);

  res.status(202).json({ status: 'processing', episodeId });
});

transcribeRouter.get('/transcriptions/:episodeId', (req, res) => {
  const row = db.prepare('SELECT * FROM transcriptions WHERE episode_id = ?').get(req.params.episodeId);
  if (!row) {
    return res.status(404).json({ error: 'No transcription found' });
  }

  if (row.status === 'processing') {
    return res.json({ status: 'processing' });
  }

  if (row.status === 'failed') {
    return res.json({ status: 'failed', error: row.error });
  }

  res.json({
    status: 'completed',
    text: row.text,
    segments: JSON.parse(row.segments || '[]'),
    language: row.language,
    duration: row.duration,
    processing_time: row.processing_time,
  });
});

transcribeRouter.delete('/transcriptions/:episodeId', (req, res) => {
  db.prepare('DELETE FROM transcriptions WHERE episode_id = ?').run(req.params.episodeId);
  res.json({ ok: true });
});
