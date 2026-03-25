require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/v1", require("./routes/product.routes"));
app.use("/api/v1", require("./routes/orders.routes"));

// Static folders
app.use(express.static(path.join(__dirname, "../public")));

// Test route
app.get("/", (req, res) => {
  res.send("ADMIN SERVER WORKING 🚀");
});

// IMPORTANT: Force numeric port; default to hosted backend port 5000
const PORT = parseInt(process.env.PORT, 10) || 5000;

// LISTEN ON ALL NETWORK INTERFACES
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Admin running on http://localhost:${PORT}`);
});
