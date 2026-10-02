import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";
import questionRoutes from "./routes/questionAnswer.js";  // Questions & answers routes
import apiRoutes from "./routes/apiRoutes.js"; // 🌤️ Weather & Mandi routes

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (_, res) => res.json({ ok: true }));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api", apiRoutes); // 👈 all your weather and mandi endpoints (e.g., /api/weather, /api/mandi)

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
