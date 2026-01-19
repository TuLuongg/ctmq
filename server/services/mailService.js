const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

exports.sendOTPEmail = async (to, otp, fullname = "") => {
  return transporter.sendMail({
    from: `"He Thong Dieu Van" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Ma OTP lay lai mat khau",
    html: `
      <p>Chao ${fullname || "ban"},</p>
      <p>Ma OTP cua ban la:</p>
      <h2>${otp}</h2>
      <p>OTP co hieu luc trong <b>5 phut</b>.</p>
    `,
  });
};
