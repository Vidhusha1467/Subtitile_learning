/**
 * Fetches the meaning of a word using the backend AI (Gemini).
 * Falls back to the free Dictionary API if context is not provided or backend fails.
 * Returns: { word, phonetic, partOfSpeech, definition, example } or null.
 */
export const fetchWordMeaning = async (word, context = "") => {
  const clean = word.toLowerCase().replace(/[^a-z'-]/g, "");
  if (!clean) return null;

  // ── 1. Try Backend AI (Gemini) first for context-aware definition ──
  if (context) {
    try {
      const res = await fetch("/api/dictionary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: clean, context }),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          word: data.word || clean,
          phonetic: "", // Gemini response currently doesn't include phonetic
          partOfSpeech: data.partOfSpeech || "",
          definition: data.definition || "No definition found",
          example: data.example || null,
        };
      }
    } catch (err) {
      console.warn("AI dictionary lookup failed, falling back to free API:", err.message);
    }
  }

  // ── 2. Fallback to free Dictionary API (Generic definition) ──
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(clean)}`
    );

    if (!res.ok) return null;

    const data = await res.json();
    const entry   = data[0];
    const meaning = entry?.meanings?.[0];
    const def     = meaning?.definitions?.[0];

    return {
      word:         entry?.word ?? clean,
      phonetic:     entry?.phonetic || "",
      partOfSpeech: meaning?.partOfSpeech ?? "",
      definition:   def?.definition ?? "Meaning not found",
      example:      def?.example ?? null,
    };
  } catch {
    return null;
  }
};
