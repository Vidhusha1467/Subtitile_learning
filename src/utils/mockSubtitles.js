// Mock subtitle data — structured exactly like a real API response would be.
// Replace fetchSubtitles() with a real API call when a backend is available.

export const fetchSubtitles = async () => {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 300));

  return [
    { id: 1, start: 0,   end: 4,   text: "Welcome to the subtitle learning platform." },
    { id: 2, start: 4,   end: 8,   text: "You can upload any video file to get started." },
    { id: 3, start: 8,   end: 13,  text: "Subtitles will appear below the video in real time." },
    { id: 4, start: 13,  end: 18,  text: "Hover over any word to discover its definition instantly." },
    { id: 5, start: 18,  end: 23,  text: "Click a word to save it to your personal vocabulary list." },
    { id: 6, start: 23,  end: 28,  text: "The dictionary API fetches meanings automatically for you." },
    { id: 7, start: 28,  end: 33,  text: "Build your vocabulary by collecting interesting words." },
    { id: 8, start: 33,  end: 38,  text: "Once you have saved words, generate a quiz to test yourself." },
    { id: 9, start: 38,  end: 43,  text: "Each question offers one correct answer and three distractors." },
    { id: 10, start: 43, end: 48,  text: "Learning languages through context is highly effective." },
    { id: 11, start: 48, end: 53,  text: "Subtitles help you understand pronunciation and grammar." },
    { id: 12, start: 53, end: 58,  text: "Practice regularly to improve your comprehension skills." },
    { id: 13, start: 58, end: 63,  text: "The quiz feature reinforces words you have already encountered." },
    { id: 14, start: 63, end: 68,  text: "Clear your saved words anytime and start a fresh session." },
    { id: 15, start: 68, end: 73,  text: "Enjoy learning with interactive subtitle-based video content." },
  ];
};
