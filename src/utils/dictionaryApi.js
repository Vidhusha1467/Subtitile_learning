/**
 * Fetches the meaning of a word from the free Dictionary API.
 * Returns: { word, definition, partOfSpeech, example } or null.
 */
export const fetchWordMeaning = async (word) => {
  const clean = word.toLowerCase().replace(/[^a-z'-]/g, "");
  if (!clean) return null;

  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(clean)}`
    );

    if (!res.ok) return null;

    const data = await res.json();
    const entry = data[0];
    const meaning = entry?.meanings?.[0];
    const def = meaning?.definitions?.[0];

    return {
      word: entry?.word ?? clean,
      partOfSpeech: meaning?.partOfSpeech ?? "",
      definition: def?.definition ?? "Meaning not found",
      example: def?.example ?? null,
    };
  } catch {
    return null;
  }
};
