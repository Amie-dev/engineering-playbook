// Express app setup - separated from server start for cleaner testing

import express from "express";

const app = express();

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "dukaan-search" });
});

export default app;
