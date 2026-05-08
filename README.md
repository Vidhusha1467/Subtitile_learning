# 🎬 SubLearn — AI-Powered Subtitle Learning Platform

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/AssemblyAI-Universal--2-FF6B6B?style=for-the-badge" />
  <img src="https://img.shields.io/badge/FFmpeg-Integrated-007808?style=for-the-badge&logo=ffmpeg&logoColor=white" />
</p>

<p align="center">
  <b>SubLearn</b> transforms any video into an interactive language learning experience.<br/>
  Upload a video or paste a YouTube URL — get AI-generated subtitles, instant word meanings, vocabulary saving, and smart quizzes.
</p>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎥 **Video Upload** | Upload MP4/WEBM files directly from your device |
| 📺 **YouTube Support** | Paste any YouTube URL and get native captions instantly |
| 🤖 **AI Transcription** | AssemblyAI (Universal-2) generates accurate, word-timed subtitles |
| 🖱️ **Hover Definitions** | Hover any subtitle word to see its dictionary meaning |
| 📚 **Vocabulary List** | Click words to save them to your personal word list |
| 🧠 **Smart Quizzes** | Auto-generated quizzes from your saved vocabulary |
| 🔐 **User Accounts** | Secure login to keep your progress synced |
| ⚡ **Real-time Sync** | Subtitles are perfectly timed and highlighted during playback |

---

## 🛠️ Tech Stack

### Frontend
- **React 19** — UI framework
- **Vite 8** — Lightning-fast dev server and build tool
- **Vanilla CSS** — Custom styling with animations
- **@xenova/transformers** — In-browser ML processing via Web Workers

### Backend
- **Node.js + Express.js** — REST API server
- **MongoDB + Mongoose** — Database for users and vocabulary
- **Multer** — Video file upload handling
- **FFmpeg (fluent-ffmpeg + ffmpeg-static)** — Audio extraction from video
- **AssemblyAI SDK** — AI-powered speech-to-text transcription
- **@distube/ytdl-core** — YouTube video/caption downloading
- **Dictionary API** — Free REST API for word definitions on hover

---

## 📁 Project Structure

```
SUBTITLE_LEARNING/
├── src/                    # React frontend source
│   ├── components/         # UI components (VideoPlayer, SubtitleBox, Quiz, etc.)
│   └── main.jsx            # App entry point
├── server/                 # Express backend
│   ├── routes/             # API route handlers
│   ├── models/             # Mongoose data models
│   ├── uploads/            # Temporary video upload storage (git-ignored)
│   ├── index.js            # Server entry point
│   └── .env                # Environment variables (git-ignored)
├── public/                 # Static assets
├── index.html
├── vite.config.js
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) **v18 or higher**
- [MongoDB](https://www.mongodb.com/try/download/community) (local) or a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) connection string
- An [AssemblyAI API key](https://www.assemblyai.com/) (free tier available)

> **Note:** FFmpeg is bundled via `ffmpeg-static` — no separate installation needed!

---

### 1. Clone the Repository

```bash
git clone https://github.com/Vidhusha1467/subtitle-learning-app.git
cd subtitle-learning-app
```

### 2. Install Dependencies

```bash
# Install frontend dependencies (from project root)
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 3. Configure Environment Variables

Create a `.env` file inside the `server/` folder:

```bash
# server/.env
PORT=3000
MONGO_URI=your_mongodb_connection_string
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
```

> ⚠️ **Never share or commit this file.** It is already excluded by `.gitignore`.

**Where to get your keys:**
- `MONGO_URI` → [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) → Create cluster → Get connection string
- `ASSEMBLYAI_API_KEY` → [assemblyai.com](https://www.assemblyai.com) → Sign up → Dashboard → Copy API key

---

### 4. Run the Application

From the **project root**, run:

```bash
npm start
```

This single command starts **both** frontend and backend simultaneously:

| Service | URL |
|---|---|
| 🖥️ Frontend (React + Vite) | http://localhost:5173 |
| 🔧 Backend (Express API) | http://localhost:3000 |

> The backend must be healthy before the frontend starts — this is handled automatically by `wait-on`.

**To run them separately (for debugging):**

```bash
# Terminal 1 — Backend only
node server/index.js

# Terminal 2 — Frontend only
npm run dev
```

---

## 📖 How to Use

1. **Sign Up / Log In** to your SubLearn account
2. **Choose a video source:**
   - 📁 Click **Upload Video** and select an MP4/WEBM file, OR
   - 📺 Paste a **YouTube URL** for instant caption loading
3. **Wait** a few seconds for AI transcription (uploaded videos)
4. **Watch** your video — subtitles appear in real-time sync
5. **Hover** any word to see its meaning from the Dictionary API
6. **Click** a word to save it to your Vocabulary List
7. **Go to Quiz** from the dashboard to test your knowledge!

---

## 🔑 API Keys & Security

This project uses the following external APIs:

| API | Purpose | Stored In |
|---|---|---|
| AssemblyAI | AI speech-to-text transcription | `server/.env` |
| MongoDB Atlas | Cloud database | `server/.env` |
| Dictionary API | Word definitions (free, no key needed) | Hardcoded URL (safe) |

All sensitive keys are stored in `server/.env` which is **excluded from Git** via `.gitignore`.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "Add: your feature description"`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License** — feel free to use, modify, and distribute.

---

<p align="center">
  Made with ❤️ by <b>Vidhusha</b><br/>
  <i>Learning languages, one subtitle at a time.</i>
</p>
