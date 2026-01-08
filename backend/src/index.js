const express = require("express");
const app = express();
require("dotenv").config();


app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

app.listen(process.env.PORT, () => {
  console.log(`http://localhost:${process.env.PORT}`);
});
