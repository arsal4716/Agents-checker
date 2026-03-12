require("dotenv").config();
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const statsRoutes = require("./routes/stats");
const publicPublisherRoutes = require("./routes/publicPublisher");
const { startCronJob } = require("./jobs/cronJob");

const app = express();
const PORT = process.env.PORT || 6003;

connectDB();

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || "dev_secret_change_in_production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60 * 1000
  },
}));

/* API ROUTES */
app.use("/api/auth", authRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/public/publisher", publicPublisherRoutes);

app.get("/api/health", (req, res) =>
  res.json({ status: "ok", timestamp: new Date() })
);

/* SERVE VITE BUILD */
const frontendPath = path.join(__dirname, "frontend", "dist");

app.use(express.static(frontendPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

/* START SERVER */
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
  startCronJob();
});