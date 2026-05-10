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
// POST /api/dictionary
// Body: { word: string, context: string }
// Returns: { word, definition, partOfSpeech, example }
// Uses Gemini to provide context-aware definitions.
// ─────────────────────────────────────────────────────────────
router.post("/dictionary", async (req, res) => {
  const { word, context } = req.body;
  if (!word) return res.status(400).json({ error: "Word is required." });

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey === "your_gemini_api_key_here") {
    return res.status(503).json({ error: "Gemini API key not configured on server." });
  }

  try {
    const prompt = `
      You are a helpful language learning assistant. 
      Provide a concise dictionary entry for the word "${word}" based on its usage in this sentence: "${context}".
      
      Return ONLY a JSON object with this structure:
      {
        "word": "${word}",
        "partOfSpeech": "...",
        "definition": "definition related to the context...",
        "example": "a new original example sentence using the word..."
      }
    `;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || "Gemini API call failed");
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) throw new Error("No response from Gemini");

    const result = JSON.parse(text);
    res.json(result);

  } catch (err) {
    console.error("❌ Dictionary error:", err.message);
    res.status(500).json({ error: "Failed to fetch AI definition." });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/quiz-distractors
// Body: { word: string, correctDef: string }
// Returns: { distractors: [string, string, string] }
// Uses Gemini to generate contextually plausible but wrong meanings.
// ─────────────────────────────────────────────────────────────
router.post("/quiz-distractors", async (req, res) => {
  const { word, correctDef } = req.body;
  if (!word) return res.status(400).json({ error: "Word is required." });

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey === "your_gemini_api_key_here") {
    return res.status(503).json({ error: "Gemini API key not configured." });
  }

  try {
    const prompt = `
      You are a language teacher creating a multiple choice quiz.
      For the English word "${word}", the correct definition is: "${correctDef}".
      
      Generate exactly 3 "distractors" (wrong answers).
      The distractors should be:
      1. Plausible and sound like real dictionary definitions.
      2. Related to the word's theme but clearly incorrect.
      3. Short (one sentence).
      
      Return ONLY a JSON object:
      {
        "distractors": ["...", "...", "..."]
      }
    `;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const result = JSON.parse(text);
    res.json(result);

  } catch (err) {
    console.error("❌ Distractor error:", err.message);
    res.status(500).json({ error: "Failed to generate AI distractors." });
  }
});

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
