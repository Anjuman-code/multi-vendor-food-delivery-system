const express = require("express");
const app = express();

const PORT = 2000;


app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
