const mongoose = require("mongoose");

const passwordSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model("OTP", passwordSchema);
