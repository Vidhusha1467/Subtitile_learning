/**
 * Transcription Web Worker — loads @xenova/transformers dynamically
 * inside the message handler to avoid Vite bundling conflicts with
 * onnxruntime-web's internal module registry (registerBackend error).
 */

let transcriber = null;

self.onmessage = async ({ data }) => {
  const { audio } = data;

  try {
    self.postMessage({ type: "status", message: "⏳ Loading Whisper model…" });

    // Dynamic import — deferred until handler runs, avoids top-level
    // module init that conflicts with Vite's worker bundling
    const { pipeline, env } = await import("@xenova/transformers");

    env.allowLocalModels = false;
    env.useBrowserCache  = true;

    // Disable multi-threading — no SharedArrayBuffer or COOP/COEP needed
    if (env?.backends?.onnx?.wasm) {
      env.backends.onnx.wasm.numThreads = 1;
    }

    if (!transcriber) {
      transcriber = await pipeline(
        "automatic-speech-recognition",
        "Xenova/whisper-tiny",
        {
          progress_callback: (p) => {
            if (p.status === "progress" && p.progress != null) {
              const file = p.file ? p.file.split("/").pop() : "";
              self.postMessage({
                type: "status",
                message: `⬇ Downloading ${file} — ${Math.round(p.progress)}%`,
              });
            } else if (p.status === "done") {
              self.postMessage({ type: "status", message: "✅ Model ready — transcribing…" });
            }
          },
        }
      );
    }

    self.postMessage({ type: "status", message: "🎙 Transcribing speech — please wait…" });

    const result = await transcriber(audio, {
      return_timestamps: true,
      chunk_length_s:    30,
      stride_length_s:   5,
      task:              "transcribe",
      language:          null,
    });

    const chunks    = Array.isArray(result.chunks) ? result.chunks : [];
    const subtitles = chunks
      .filter((c) => c.text?.trim().length > 0)
      .map((c, idx) => ({
        id:    idx + 1,
        start: parseFloat((c.timestamp[0] ?? 0).toFixed(2)),
        end:   parseFloat(((c.timestamp[1] ?? (c.timestamp[0] ?? 0) + 4)).toFixed(2)),
        text:  c.text.trim(),
      }));

    if (subtitles.length === 0) {
      self.postMessage({ type: "error", message: "No speech detected. Try a video with clear spoken audio." });
    } else {
      self.postMessage({ type: "complete", subtitles });
    }

  } catch (err) {
    console.error("[TranscribeWorker]", err);
    self.postMessage({ type: "error", message: err?.message ?? String(err) });
  }
};
