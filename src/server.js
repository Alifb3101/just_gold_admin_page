require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static folders
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(express.static(path.join(__dirname, "../public")));

// Test route
app.get("/", (req, res) => {
  res.send("ADMIN SERVER WORKING 🚀");
});

// Routes
app.use("/api/products", require("./routes/product.routes"));

// IMPORTANT: Force numeric port
const PORT = parseInt(process.env.PORT) || 3001;

// LISTEN ON ALL NETWORK INTERFACES
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Admin running on http://localhost:${PORT}`);
});
