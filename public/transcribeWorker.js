/**
 * public/transcribeWorker.js
 *
 * Processes audio in small independent chunks and streams subtitle
 * results back to the main thread as each chunk finishes — giving
 * a true real-time feel and eliminating the hallucination/repeat bug.
 */
let transcriber = null;

const SAMPLE_RATE   = 16_000;
const CHUNK_SECS    = 10;          // process 10 seconds at a time
const CHUNK_SAMPLES = CHUNK_SECS * SAMPLE_RATE;

self.onmessage = async ({ data }) => {
  const { audio } = data;  // Float32Array @ 16 kHz

  try {
    // ── 1. Load model ───────────────────────────────────────────
    self.postMessage({ type: "status", message: "Loading Whisper AI model…" });

    const { pipeline, env } = await import(
      "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js"
    );

    env.allowLocalModels = false;
    env.useBrowserCache  = true;
    env.backends.onnx.wasm.numThreads = 1;
    env.backends.onnx.wasm.wasmPaths  =
      "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/";

    if (!transcriber) {
      transcriber = await pipeline(
        "automatic-speech-recognition",
        "Xenova/whisper-tiny",
        {
          progress_callback: (p) => {
            if (p.status === "progress" && p.progress != null) {
              self.postMessage({
                type: "status",
                message: `Downloading model… ${Math.round(p.progress)}%`,
              });
            } else if (p.status === "done") {
              self.postMessage({ type: "status", message: "Model ready — starting…" });
            }
          },
        }
      );
    }

    // ── 2. Stream chunk-by-chunk ────────────────────────────────
    const totalChunks = Math.ceil(audio.length / CHUNK_SAMPLES);
    let subtitleId = 1;
    const lastTexts = []; // rolling buffer to detect cross-chunk loops

    for (let i = 0; i < totalChunks; i++) {
      const chunkStart   = i * CHUNK_SAMPLES;
      const chunkEnd     = Math.min(chunkStart + CHUNK_SAMPLES, audio.length);
      const chunk        = audio.slice(chunkStart, chunkEnd);
      const offsetSecs   = i * CHUNK_SECS; // real-time offset in seconds

      self.postMessage({
        type: "status",
        message: `Transcribing… ${Math.round(((i + 1) / totalChunks) * 100)}% (chunk ${i + 1}/${totalChunks})`,
      });

      // Skip chunks that are too short (< 0.5 s)
      if (chunk.length < SAMPLE_RATE * 0.5) continue;

      let result;
      try {
        result = await transcriber(chunk, {
          return_timestamps: true,
          task:              "transcribe",
          language:          null,            // auto-detect
          // Anti-hallucination params
          temperature:              0,        // deterministic, no random loops
          no_repeat_ngram_size:     3,        // block 3-gram repeats
          repetition_penalty:       1.3,
          condition_on_prev_tokens: false,    // each chunk is independent
          compression_ratio_threshold: 2.4,
          logprob_threshold:        -1.0,
          no_speech_threshold:      0.6,
        });
      } catch (chunkErr) {
        console.warn(`Chunk ${i} failed:`, chunkErr);
        continue; // skip bad chunk, continue with rest
      }

      const chunks = Array.isArray(result.chunks) ? result.chunks : [];
      const newSubs = [];

      for (const c of chunks) {
        const text = c.text?.trim();
        if (!text || text.length < 2) continue;

        // Normalise for loop detection
        const norm = text.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();

        // If the last 3 emitted lines are all identical to this, it's looping
        if (
          lastTexts.length >= 3 &&
          lastTexts.slice(-3).every((t) => t === norm)
        ) {
          continue;
        }

        lastTexts.push(norm);
        if (lastTexts.length > 10) lastTexts.shift(); // keep rolling buffer small

        newSubs.push({
          id:    subtitleId++,
          start: parseFloat((offsetSecs + (c.timestamp[0] ?? 0)).toFixed(2)),
          end:   parseFloat((offsetSecs + (c.timestamp[1] ?? (c.timestamp[0] ?? 0) + 3)).toFixed(2)),
          text,
        });
      }

      if (newSubs.length > 0) {
        // ← Stream new lines to the main thread immediately
        self.postMessage({ type: "partial", subtitles: newSubs });
      }
    }

    // ── 3. Signal completion ────────────────────────────────────
    self.postMessage({ type: "complete" });

  } catch (err) {
    console.error("[Worker]", err);
    self.postMessage({ type: "error", message: err?.message ?? "Transcription failed." });
  }
};
