const express = require("express");
const app = express();
const mongoose = require("mongoose");
const bodyparser = require("body-parser");
const path = require("path");
const cors = require("cors");
const randomize = require("randomatic");
const nodemailer = require("nodemailer");
// Files
const OTP = require("./passwordSchema");

require("dotenv").config();
app.use(cors()); // to be changed for production
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: false }));

let mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to mongoDB"))
  .catch((err) => console.log(err));

// Generating OTP Email
app.post("/generateotp", (req, res) => {
  const email = req.body.email;
  const digits = req.body.digits;
  const subject = req.body.subject;
  const companyName = req.body.companyName;

  const genotp = randomize("0", digits);

  const otp = new OTP({
    email: email,
    otp: genotp,
  });

  otp
    .save()
    .then((resp) => {
      let mailDetails = {
        from: process.env.EMAIL,
        to: email,
        subject: subject,
        text: `The OTP for verification at ${companyName} is ${genotp}.`,
      };

      mailTransporter.sendMail(mailDetails, function (err, data) {
        if (err) {
          res.status(400).status("Error Occured while sending OTP");
        } else {
          res.status(200).json("Email with OTP sent successfully");
        }
      });

      res.json("OTP Sent Successfully");
    })
    .catch((err) => res.status(400).json("Can't generate OTP", err));
});

//Verifying OTP Email
app.post("/verifyotp", (req, res) => {
  const email = req.body.email;
  const providedotp = req.body.otp;

  OTP.find({ email: email }, (err, doc) => {
    if (err)
      res
        .status(400)
        .json(
          "Couldn't be verified successfully due to an error. Please try after some time."
        );
    console.log(doc.length);
    console.log(doc);
    if (doc[doc.length - 1].otp == providedotp)
      res.status(200).json("Verified Successfully");
    else res.status(400).json("Invalid OTP");
  });
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server Running On Port ${port}`));
