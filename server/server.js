// ── MUST be first — loads .env before anything else reads process.env ──
const path   = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, ".env") }); // always finds server/.env

const express      = require("express");
const cors         = require("cors");
const fs           = require("fs");
const connectDB    = require("./db");

// Models
const User         = require("./models/User");
const Product      = require("./models/Product");

// Routes (loaded AFTER dotenv so ASSEMBLYAI_API_KEY is available)
const transcribeRouter = require("./routes/transcribe");

// ── Ensure uploads directory exists ─────────────────────────
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ── Express App ───────────────────────────────────────────────
const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

// ─────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "SubLearn API is running ✅" });
});

app.get("/health", (_, res) => res.json({ ok: true }));

// ─────────────────────────────────────────────────────────────
// TRANSCRIPTION ROUTE  →  POST /api/transcribe
// ─────────────────────────────────────────────────────────────
app.use("/api", transcribeRouter);

// (Meaning lookup is handled directly on the frontend via the free Dictionary API)

// ─────────────────────────────────────────────────────────────
// USER AUTH
// ─────────────────────────────────────────────────────────────

// SIGNUP  →  POST /signup
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email, and password are required" });
    }

    // Check if user already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const user = await User.create({ name, email, password });
    res.status(201).json({ message: "Signup successful", user: { name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN  →  POST /login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase(), password });
    if (user) {
      res.json({ message: "Login successful", user: { name: user.name, email: user.email } });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// FORGOT PASSWORD  →  POST /forgot-password
app.post("/api/forgot-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: "email and newPassword are required" });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: "No account found with this email" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PRODUCTS CRUD
// ─────────────────────────────────────────────────────────────

// CREATE  →  POST /products
app.post("/products", async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ ALL  →  GET /products
app.get("/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ ONE  →  GET /products/:id
app.get("/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE  →  PUT /products/:id
app.put("/products/:id", async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Product not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE  →  DELETE /products/:id
app.delete("/products/:id", async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// START SERVER  (after MongoDB connects)
// ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();                          // ✅ wait for MongoDB first

    app.listen(PORT, () => {
      console.log(`\n✅ Connected to MongoDB`);
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`   URL  →  http://localhost:${PORT}\n`);
    });

  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

startServer();