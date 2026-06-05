const nodemailer = require("nodemailer");

const emailProvider = String(
  process.env.EMAIL_PROVIDER || (process.env.RESEND_API_KEY ? "resend" : "smtp")
).toLowerCase();

const mailUser = process.env.SMTP_USER;
const mailPass = process.env.SMTP_PASS
  ? process.env.SMTP_PASS.replace(/\s+/g, "")
  : "";
const resendApiKey = process.env.RESEND_API_KEY;
const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure =
  String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
const smtpRequireTls =
  String(process.env.SMTP_REQUIRE_TLS || "true").toLowerCase() === "true";
const mailFrom = process.env.MAIL_FROM || mailUser || "onboarding@resend.dev";

if (emailProvider === "smtp" && (!mailUser || !mailPass)) {
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

async function sendWithResend(to, otp) {
  if (!resendApiKey) {
    throw new Error("OTP mailer is not configured. Set RESEND_API_KEY.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: mailFrom,
      to,
      subject: "OTP Verification",
      text: `Your OTP is ${otp}`,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(`Resend email failed: ${response.status} ${body}`);
    error.code = "RESEND_ERROR";
    error.responseCode = response.status;
    error.responseBody = body;
    throw error;
  }
}

async function sendWithSmtp(to, otp) {
  if (!mailUser || !mailPass) {
    throw new Error("OTP mailer is not configured. Set SMTP_USER and SMTP_PASS.");
  }

  await transporter.sendMail({
    from: mailFrom,
    to,
    subject: "OTP Verification",
    text: `Your OTP is ${otp}`,
  });
}

exports.sendEmail = async (to, otp) => {
  if (emailProvider === "resend") {
    await sendWithResend(to, otp);
    return;
  }

  await sendWithSmtp(to, otp);
};
