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
    useFindAndModify: false,
  })
  .then(() => console.log("Connected to mongoDB"))
  .catch((err) => console.log(err));

// Generating OTP Email
// INPUT : email,subject,companyName,digits as string
// fields:{
//   email:<Provide_the_email_to_be_sent_an_email>,
//   subject:<Subject_of_the_email>,
//   companyName:<Name_of_the_company_who_is_using_our_service>,
//   digits:<No._of_digits_in_the_password>
// }
//OUTPUT:
// STATUS 400 "Error occured while sending OTP" //if mailer has a problem
// STATUS 400 "Can't generate OTP", ${err}  //if  unable to save in the database(internal issue)
// STATUS 200 "Email with OTP sent successfully"  //success
app.post("/generateotp", (req, res) => {
  const email = req.body.email;
  const digits = req.body.digits;
  const subject = req.body.subject;
  const companyName = req.body.companyName;

  const genotp = randomize("0", digits).toString();
  OTP.findOneAndUpdate(
    { email: email },
    { $set: { otp: genotp } },
    { new: true },
    (err, doc) => {
      if (err) {
        res.status(400).json("Error occured while sending OTP");
      }
      if (!doc) {
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
          })
          .catch((err) => res.status(400).json("Can't generate OTP", err));
      } else {
        let mailDetails = {
          from: process.env.EMAIL,
          to: email,
          subject: subject,
          text: `The OTP for verification at ${companyName} is ${genotp}.`,
        };

        mailTransporter.sendMail(mailDetails, function (err, data) {
          if (err) {
            res.status(400).json("Error Occured while sending OTP");
          } else {
            res.status(200).json("Email with OTP sent successfully");
          }
        });
      }
    }
  );
});

//Verifying OTP Email
// INPUT : email,otp
// fields:{
//   email:<Provide_the_email_whose_OTP_needs_to_be_verified>,
//   otp:<OTP_provided_by_the_user>
// }
//OUTPUT:
// STATUS 400 "Couldn't be verified successfully due to an error. Please try after some time" //server issue
// STATUS 400 "Invalid OTP" //when entered wrong otp
// STATUS 200 "Verified Successfully" //success
app.post("/verifyotp", (req, res) => {
  const email = req.body.email;
  const providedotp = req.body.otp.toString();

  OTP.findOne({ email: email }, (err, doc) => {
    if (err)
      res
        .status(400)
        .json(
          "Couldn't be verified successfully due to an error. Please try after some time"
        );
    if (doc.otp === providedotp) res.status(200).json("Verified Successfully");
    else res.status(400).json("Invalid OTP");
  });
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server Running On Port ${port}`));
