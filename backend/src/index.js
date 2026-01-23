const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser"); // Add cookie parser
const Name = require("./models/name");
const restaurantRoutes = require('./routes/restaurantRoutes');
const authRoutes = require('./routes/authRoutes'); // Import auth routes

const corsOptions = {
  origin: "http://localhost:5173",
  credentials: true // Enable credentials for cookies
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser()); // Add cookie parser middleware

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

// Routes
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/auth', authRoutes); // Add auth routes

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

app.get("/save/:name", async (req, res) => {
  try {
    const newName = new Name({
      name: req.params.name,
    });

    await newName.save();

    res.json({
      message: "Name saved successfully",
      data: newName,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to save name" });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});
