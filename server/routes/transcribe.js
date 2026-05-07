const express      = require("express");
const multer       = require("multer");
const path         = require("path");
const fs           = require("fs");
const ffmpeg       = require("fluent-ffmpeg");
const ffmpegPath   = require("ffmpeg-static");          // ← bundled ffmpeg binary (Windows safe)
const { AssemblyAI } = require("assemblyai");

// Tell fluent-ffmpeg where the binary is
ffmpeg.setFfmpegPath(ffmpegPath);

const router = express.Router();

// ── Ensure uploads directory exists ──────────────────────────
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ── AssemblyAI client ─────────────────────────────────────────
const apiKey = process.env.ASSEMBLYAI_API_KEY;
if (!apiKey) {
  console.warn("⚠️  ASSEMBLYAI_API_KEY is not set — transcription will fail.");
}
const client = new AssemblyAI({ apiKey: apiKey || "" });

// ── Multer: save uploads to /server/uploads ───────────────────
const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 500 * 1024 * 1024 },       // 500 MB max
});

// ─────────────────────────────────────────────────────────────
// POST /api/transcribe
// Body: multipart/form-data  { video: <file> }
// Returns: { subtitles: [{ id, start, end, text }] }
// ─────────────────────────────────────────────────────────────
router.post("/transcribe", upload.single("video"), async (req, res) => {
  // Allow up to 15 min for large video upload + transcription
  req.setTimeout(15 * 60 * 1000);
  res.setTimeout(15 * 60 * 1000);

  if (!req.file) {
    return res.status(400).json({ error: "No video file uploaded." });
  }

  // Check API key is configured
  if (!process.env.ASSEMBLYAI_API_KEY || process.env.ASSEMBLYAI_API_KEY === "your_api_key_here") {
    safeDelete(req.file.path);
    return res.status(500).json({
      error: "AssemblyAI API key is not set. Please add it to server/.env",
    });
  }

  const videoPath = req.file.path;
  const audioPath = videoPath + ".wav";

  try {
    // ── 1. Extract mono 16 kHz WAV from the video ─────────────
    console.log("🎞  Extracting audio with ffmpeg…");
    await extractAudio(videoPath, audioPath);
    console.log("✔  Audio extracted:", audioPath);

    // ── 2. Transcribe via AssemblyAI ──────────────────────────
    console.log("🤖  Sending audio to AssemblyAI…");
    const transcript = await client.transcripts.transcribe({
      audio:          audioPath,
      speech_models:  ["universal-2"],
      language_code:  "en",
      punctuate:      true,
      format_text:    true,
    });

    if (transcript.status === "error") {
      throw new Error(transcript.error || "AssemblyAI transcription failed");
    }

    if (!transcript.words || transcript.words.length === 0) {
      return res.json({ subtitles: [], message: "No speech detected in the video." });
    }

    // ── 3. Group words into subtitle lines ────────────────────
    const subtitles = buildSubtitles(transcript.words);
    console.log(`✅  ${subtitles.length} subtitle lines generated`);

    res.json({ subtitles });

  } catch (err) {
    console.error("❌ Transcription error:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    // Always clean up temp files
    safeDelete(videoPath);
    safeDelete(audioPath);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/transcribe-youtube
// Fetches YouTube's own built-in captions (no audio download needed)
// Body: { youtubeUrl: string }
// ─────────────────────────────────────────────────────────────
router.post("/transcribe-youtube", async (req, res) => {
  const { youtubeUrl } = req.body;
  if (!youtubeUrl) {
    return res.status(400).json({ error: "YouTube URL is required." });
  }

  try {
    // ── 1. Extract video ID from any YouTube URL format ──────
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return res.status(400).json({ error: "Could not extract a valid YouTube video ID from that URL." });
    }
    console.log("🔗 Processing YouTube video ID:", videoId);

    // ── 2. Fetch the YouTube watch page ──────────────────────
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageRes = await fetch(watchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    const html = await pageRes.text();

    // ── 3. Extract captionTracks from the page ───────────────
    // YouTube embeds this in ytInitialPlayerResponse
    const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])(?=\s*,\s*")/);
    
    let tracks = [];
    if (captionMatch && captionMatch[1]) {
      try {
        // YouTube escapes & as \u0026 in the JSON
        const cleaned = captionMatch[1].replace(/\\u0026/g, '&');
        tracks = JSON.parse(cleaned);
      } catch (parseErr) {
        console.log("⚠️ Failed to parse captionTracks JSON:", parseErr.message);
      }
    }

    console.log(`🎯 Found ${tracks.length} caption track(s):`, 
      tracks.map(t => `${t.languageCode} - ${t.name?.simpleText || 'auto'}`));

    if (tracks.length === 0) {
      return res.status(404).json({ 
        error: "No captions found for this YouTube video. The video may not have subtitles enabled." 
      });
    }

    // ── 4. Pick best track (English preferred, then any) ─────
    const track = tracks.find(t => t.languageCode === 'en')
      || tracks.find(t => t.languageCode?.startsWith('en'))
      || tracks[0];

    console.log(`✔ Using caption track: "${track.languageCode}" - "${track.name?.simpleText || 'auto'}"`);

    // ── 5. Fetch the caption data as JSON3 ───────────────────
    let subtitles = [];

    // Fix the baseUrl — YouTube sometimes escapes ampersands
    const baseUrl = track.baseUrl.replace(/\\u0026/g, '&');

    // Try JSON3 format first (structured, easy to parse)
    try {
      const json3Url = baseUrl + '&fmt=json3';
      console.log("📥 Fetching JSON3 captions...");
      const capRes = await fetch(json3Url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      const capText = await capRes.text();
      
      let capData;
      try { capData = JSON.parse(capText); } catch { capData = null; }

      if (capData && capData.events) {
        let id = 1;
        for (const event of capData.events) {
          if (!event.segs || event.tStartMs == null) continue;
          const text = event.segs
            .map(s => s.utf8 || '')
            .join('')
            .replace(/\n/g, ' ')
            .trim();
          if (!text) continue;

          const start = event.tStartMs / 1000;
          const dur = (event.dDurationMs || 3000) / 1000;
          subtitles.push({ id: id++, start, end: start + dur, text });
        }
      }

      if (subtitles.length > 0) {
        console.log(`✅ Got ${subtitles.length} captions via JSON3!`);
        return res.json({ subtitles });
      }
    } catch (jsonErr) {
      console.log("⚠️ JSON3 fetch failed:", jsonErr.message);
    }

    // Try XML format as fallback
    try {
      console.log("📥 Trying XML format...");
      const xmlRes = await fetch(baseUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      const xmlText = await xmlRes.text();

      const textRegex = /<text\s+[^>]*?start="([\d.]+)"[^>]*?dur="([\d.]+)"[^>]*?>([\s\S]*?)<\/text>/g;
      let m;
      while ((m = textRegex.exec(xmlText)) !== null) {
        const start = parseFloat(m[1]);
        const dur = parseFloat(m[2]);
        let text = m[3]
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/\n/g, ' ')
          .trim();
        if (text) subtitles.push({ id: subtitles.length + 1, start, end: start + dur, text });
      }

      if (subtitles.length > 0) {
        console.log(`✅ Got ${subtitles.length} captions via XML!`);
        return res.json({ subtitles });
      }
    } catch (xmlErr) {
      console.log("⚠️ XML fetch failed:", xmlErr.message);
    }

    // If we got here, captions exist but we couldn't parse them
    return res.status(500).json({ error: "Found caption tracks but failed to download them. Please try another video." });

  } catch (err) {
    console.error("❌ YouTube caption error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Helpers ───────────────────────────────────────────────────

/**
 * Extract YouTube video ID from any URL format.
 * Supports: youtu.be/ID, youtube.com/watch?v=ID, /embed/ID, /shorts/ID, etc.
 */
function extractVideoId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  // Maybe it's just a raw ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  return null;
}

/**
 * Run ffmpeg to extract a mono 16kHz WAV from any video file.
 */
function extractAudio(videoPath, audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .audioCodec("pcm_s16le")
      .audioChannels(1)
      .audioFrequency(16000)
      .format("wav")
      .on("start", (cmd) => console.log("   ffmpeg cmd:", cmd))
      .on("end", resolve)
      .on("error", (err) => reject(new Error("ffmpeg error: " + err.message)))
      .save(audioPath);
  });
}

/**
 * Group AssemblyAI word objects into subtitle line objects.
 * Splits at sentence-ending punctuation or every maxWords words.
 */
function buildSubtitles(words, maxWords = 8) {
  if (!words || !words.length) return [];

  const subtitles = [];
  let group = [];
  let id = 1;

  const flush = () => {
    if (!group.length) return;
    subtitles.push({
      id:    id++,
      start: group[0].start  / 1000,    // ms → seconds
      end:   group[group.length - 1].end / 1000,
      text:  group.map((w) => w.text).join(" "),
    });
    group = [];
  };

  for (const word of words) {
    group.push(word);
    const endsLine = /[.!?]$/.test(word.text) || group.length >= maxWords;
    if (endsLine) flush();
  }
  flush(); // flush any remaining words

  return subtitles;
}

function safeDelete(p) {
  try {
    if (p && fs.existsSync(p)) fs.unlinkSync(p);
  } catch (_) {}
}

module.exports = router;
