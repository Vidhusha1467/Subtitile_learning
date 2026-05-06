# 🎬 SubLearn: AI-Powered Language Learning through Subtitles

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4ea94b?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

**SubLearn** is a revolutionary platform designed to bridge the gap between entertainment and language acquisition. By leveraging state-of-the-art AI, SubLearn transforms any video into an interactive learning experience with real-time captions, instant dictionary lookups, and personalized vocabulary practice.

---

## 🌟 Key Features

### 🤖 AI-Driven Transcription
Powered by **AssemblyAI (Universal-2)**, SubLearn automatically extracts audio from your uploaded videos and generates high-accuracy, word-level timestamps. No manual subtitle files needed!

### 🖱️ Interactive Vocabulary
- **Instant Lookup:** Hover over any word in the subtitles to see its dictionary definition.
- **One-Click Save:** Found a difficult word? Click it to instantly save it to your personal learning list.
- **Visual Sync:** Subtitles are perfectly synchronized with the video playback, highlighting active segments in real-time.

### 🧠 Smart Quizzes
Turn your saved words into interactive learning sessions. SubLearn generates dynamic quizzes from your personal vocabulary list to ensure long-term retention.

### 🔐 Secure User Accounts
Built on the **MERN Stack**, SubLearn features a secure authentication system to keep your learning progress and vocabulary lists synced across sessions.

---

## 🛠️ Technical Architecture

- **Frontend:** Built with **React 19** and **Vite** for a blazing-fast user interface.
- **Backend:** **Express.js** handles video processing and API orchestration.
- **Media Engine:** **FFmpeg** integration for seamless audio extraction from video uploads.
- **Storage:** **MongoDB** for robust data persistence of users and vocabulary.
- **Real-time Workers:** Utilizes **Web Workers** for background transcription status tracking.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [FFmpeg](https://ffmpeg.org/) (Installed and in your system PATH)
- [MongoDB](https://www.mongodb.com/try/download/community) (Running instance)

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/Vidhusha1467/SUBTITLE_LEARNING.git
cd SUBTITLE_LEARNING

# Install Frontend dependencies
npm install

# Install Backend dependencies
cd server
npm install
```

### 2. Environment Configuration
Create a `.env` file in the `server` directory:
```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
GEMINI_API_KEY=your_google_gemini_api_key
```

### 3. Launch the Application
From the root directory, run:
```bash
npm start
```
*This command starts both the Vite frontend (port 5173) and the Express backend (port 3000) simultaneously.*

---

## 📖 How to Use
1. **Sign Up/Login** to your SubLearn account.
2. **Upload** a video file (MP4, WEBM, etc.).
3. **Wait** a few moments for the AI to transcribe the audio.
4. **Watch** your video with real-time, interactive captions.
5. **Hover/Click** words to learn and save them.
6. **Take a Quiz** from your dashboard to test your knowledge!

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/Vidhusha1467/SUBTITLE_LEARNING/issues).

## 📄 License
Distributed under the **MIT License**. See `LICENSE` for more information.

---
*Created with ❤️ by Vidhusha*
