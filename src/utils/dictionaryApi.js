/**
 * Fetches the contextual definition of a word based on the video subtitle sentence.
 * Returns an object: { word, definition, partOfSpeech, example }
 * Returns null if the word is not found or the request fails.
 */
export const fetchWordMeaning = async (word, context = "") => {
  const clean = word.toLowerCase().replace(/[^a-z'-]/g, "");
  if (!clean) return null;

  try {
    const res = await fetch("/api/meaning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: clean, context }),
    });
    
    if (!res.ok) {
      // Fallback to basic dictionary if backend fails (e.g. no API key)
      const fallbackRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${clean}`);
      if (!fallbackRes.ok) return null;
      const data = await fallbackRes.json();
      const entry = data[0];
      const meaning = entry?.meanings?.[0];
      const def = meaning?.definitions?.[0];

      return {
        word: entry?.word ?? clean,
        partOfSpeech: meaning?.partOfSpeech ?? "",
        definition: def?.definition ?? "No definition found.",
        example: def?.example ?? null,
      };
    }
    
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
};
