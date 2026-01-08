const mongoose = require("mongoose");

const nameSchema = new mongoose.Schema({
  name: String,
});

module.exports = mongoose.model("Name", nameSchema);
