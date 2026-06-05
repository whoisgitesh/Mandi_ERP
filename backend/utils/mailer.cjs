const nodemailer = require("nodemailer");

const mailUser = process.env.SMTP_USER;
const mailPass = process.env.SMTP_PASS
  ? process.env.SMTP_PASS.replace(/\s+/g, "")
  : "";
const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure =
  String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
const smtpRequireTls =
  String(process.env.SMTP_REQUIRE_TLS || "true").toLowerCase() === "true";
const mailFrom = process.env.MAIL_FROM || mailUser;

if (!mailUser || !mailPass) {
  console.warn(
    "Mailer is not configured. Set SMTP_USER and SMTP_PASS environment variables."
  );
}

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  requireTLS: smtpRequireTls,
  connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 10000),
  greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 10000),
  socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 15000),
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
