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

// ── Helpers ───────────────────────────────────────────────────

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
