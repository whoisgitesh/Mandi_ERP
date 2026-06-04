const nodemailer = require("nodemailer");

const mailUser = process.env.SMTP_USER;
const mailPass = process.env.SMTP_PASS
  ? process.env.SMTP_PASS.replace(/\s+/g, "")
  : "";
const mailService = process.env.SMTP_SERVICE || "gmail";
const mailFrom = process.env.MAIL_FROM || mailUser;

if (!mailUser || !mailPass) {
  console.warn(
    "Mailer is not configured. Set SMTP_USER and SMTP_PASS environment variables."
  );
}

const transporter = nodemailer.createTransport({
  service: mailService,
  auth: {
    user: mailUser,
    pass: mailPass,
  },
});

exports.sendEmail = async (to, otp) => {
  if (!mailUser || !mailPass) {
    throw new Error("OTP mailer is not configured. Set SMTP_USER and SMTP_PASS.");
  }

  await transporter.sendMail({
    from: mailFrom,
    to,
    subject: "OTP Verification",
    text: `Your OTP is ${otp}`,
  });
};
