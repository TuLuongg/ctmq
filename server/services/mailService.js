const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendOTPEmail = async (to, otp, fullname = "") => {
  try {
    const result = await resend.emails.send({
      from: "no-reply@mail.ctmq.com", // ⚠️ BẮT BUỘC
      to,
      subject: "Ma OTP lay lai mat khau",
      html: `
        <p>Chao ${fullname || "ban"},</p>
        <h2>${otp}</h2>
        <p>OTP co hieu luc 5 phut</p>
      `,
    });

    console.log("✅ RESEND OK:", result);
    return result;
  } catch (err) {
    console.error("❌ RESEND ERROR:", err);
    throw err; // QUAN TRỌNG
  }
};
