const express = require("express");
const app = express();
require("dotenv").config();
const mongoose = require("mongoose");
const Name = require("./models/name");

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

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
  console.log(`http://localhost:${process.env.PORT}`);
});
