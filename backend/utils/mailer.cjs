const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "giteshpal25.04.03@gmail.com",
    pass: "pose dirx cccm idef",
  },
});

exports.sendEmail = async (to, otp) => {
  await transporter.sendMail({
    from: "giteshpal25.04.03@gmail.com",
    to,
    subject: "OTP Verification",
    text: `Your OTP is ${otp}`,
  });
};