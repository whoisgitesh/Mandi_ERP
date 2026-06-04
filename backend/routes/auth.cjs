// const express = require("express");
// const router = express.Router();
// const bcrypt = require("bcrypt");
// const pool = require("../db.cjs");
// const { sendEmail } = require("../utils/mailer.cjs");



// router.post("/login", async (req, res) => {
//   const { email, password } = req.body;

//   const user = await pool.query(
//     "SELECT * FROM users WHERE email=$1",
//     [email]
//   );

//   if (user.rows.length === 0) {
//     return res.status(400).json({ error: "User not found" });
//   }

//   const valid = await bcrypt.compare(
//     password,
//     user.rows[0].password_hash
//   );

//   if (!valid) {
//     return res.status(400).json({ error: "Invalid password" });
//   }

//   res.json({ success: true, user: user.rows[0] });
// });


// // 🔹 STEP 1: SEND OTP
// router.post("/send-otp", async (req, res) => {
//   const { email } = req.body;

//   const otp = Math.floor(100000 + Math.random() * 900000).toString();
//   const hash = await bcrypt.hash(otp, 10);

//   await pool.query(
//     "INSERT INTO otp_codes(email, otp_hash, expires_at) VALUES($1,$2,NOW() + INTERVAL '5 min')",
//     [email, hash]
//   );

//   await sendEmail(email, otp);

//   res.json({ message: "OTP sent" });
// });


// // 🔹 STEP 2: VERIFY OTP
// router.post("/verify-otp", async (req, res) => {
//   const { email, otp } = req.body;

//   const result = await pool.query(
//     "SELECT * FROM otp_codes WHERE email=$1 ORDER BY created_at DESC LIMIT 1",
//     [email]
//   );

//   const record = result.rows[0];

//   if (!record) return res.status(400).json({ error: "No OTP found" });

//   const valid = await bcrypt.compare(otp, record.otp_hash);

//   if (!valid) return res.status(400).json({ error: "Invalid OTP" });

//   if (new Date(record.expires_at) < new Date()) {
//     return res.status(400).json({ error: "OTP expired" });
//   }

//   res.json({ success: true });
// });


// // 🔹 STEP 3: RESET PASSWORD
// router.post("/reset-password", async (req, res) => {
//   const { email, newPassword } = req.body;

//   const hash = await bcrypt.hash(newPassword, 10);

//   await pool.query(
//     "UPDATE users SET password_hash=$1 WHERE email=$2",
//     [hash, email]
//   );

//   res.json({ message: "Password updated successfully" });
// });

// module.exports = router;


const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const pool = require("../db.cjs");
const { sendEmail } = require("../utils/mailer.cjs");

const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

router.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 🔹 Check if user already exists
    const existing = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    // 🔹 Hash password
    const hash = await bcrypt.hash(password, 10);

    // 🔹 Insert user
    const result = await pool.query(
      "INSERT INTO users(email, password_hash) VALUES($1,$2) RETURNING id, email",
      [email, hash]
    );

    const user = result.rows[0];

    // 🔥 STEP 4 USED HERE → generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      user,
      token,   // 👈 important for frontend login state
    });

  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(400).json({ error: "Invalid password" });
    }

    // 🔥 GENERATE JWT (MISSING PART FIXED)
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      token, // ✅ REQUIRED for frontend auth
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// 🔹 STEP 1: SEND OTP
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    // ✅ Check user exists
    const user = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(400).json({ error: "User not found" });
    }

    // ✅ Delete old OTPs
    await pool.query(
      "DELETE FROM otp_codes WHERE email=$1",
      [email]
    );

    // ✅ Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = await bcrypt.hash(otp, 10);

    // ✅ Store OTP
    await pool.query(
      `INSERT INTO otp_codes(email, otp_hash, expires_at)
       VALUES($1,$2,NOW() + INTERVAL '5 min')`,
      [email, hash]
    );

    // ✅ Send email
    await sendEmail(email, otp);

    res.json({ message: "OTP sent" });
  } catch (err) {
    console.error("SEND OTP ERROR:", err);

    const message = String(err.message || "");
    const smtpAuthFailed =
      err.code === "EAUTH" ||
      err.responseCode === 535 ||
      message.toLowerCase().includes("invalid login") ||
      message.toLowerCase().includes("username and password not accepted");

    if (message.includes("OTP mailer is not configured")) {
      return res.status(500).json({
        error: "OTP mailer is not configured on server.",
      });
    }

    if (smtpAuthFailed) {
      return res.status(500).json({
        error: "OTP email login failed. Check SMTP_USER and SMTP_PASS on Render.",
      });
    }

    res.status(500).json({
      error: "Failed to send OTP email.",
    });
  }
});


// 🔹 STEP 2: VERIFY OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const result = await pool.query(
      "SELECT * FROM otp_codes WHERE email=$1 ORDER BY created_at DESC LIMIT 1",
      [email]
    );

    const record = result.rows[0];

    if (!record) {
      return res.status(400).json({ error: "No OTP found" });
    }

    // ❌ Expired
    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: "OTP expired" });
    }

    // ❌ Too many attempts
    if (record.attempts >= 5) {
      return res.status(400).json({ error: "Too many attempts" });
    }

    const valid = await bcrypt.compare(otp, record.otp_hash);

    if (!valid) {
      // ✅ increase attempts
      await pool.query(
        "UPDATE otp_codes SET attempts = attempts + 1 WHERE id=$1",
        [record.id]
      );

      return res.status(400).json({ error: "Invalid OTP" });
    }

    res.json({ success: true });

  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// 🔹 STEP 3: RESET PASSWORD
router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    // ✅ Ensure OTP was verified (exists)
    const result = await pool.query(
      "SELECT * FROM otp_codes WHERE email=$1 ORDER BY created_at DESC LIMIT 1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "OTP verification required" });
    }

    const record = result.rows[0];

    // ❌ expired
    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: "OTP expired" });
    }

    // ✅ Hash password
    const hash = await bcrypt.hash(newPassword, 10);

    const update = await pool.query(
      "UPDATE users SET password_hash=$1 WHERE email=$2",
      [hash, email]
    );

    if (update.rowCount === 0) {
      return res.status(400).json({ error: "User not found" });
    }

    // ✅ Clean OTP after success
    await pool.query(
      "DELETE FROM otp_codes WHERE email=$1",
      [email]
    );

    res.json({ message: "Password updated successfully" });

  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
