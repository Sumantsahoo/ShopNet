const nodemailer = require("nodemailer");

const isPlaceholder = (value) =>
  !value ||
  value.startsWith("your_") ||
  value.includes("example.com") ||
  value.includes("yourgmail.com");

const sendEmail = async (to, subject, text) => {
  if (process.env.EMAIL_ENABLED === "false") {
    throw new Error("Email sending is disabled in environment variables (EMAIL_ENABLED=false)");
  }

  // 1. RESEND API over HTTPS Port 443 (Recommended for Render)
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "ShopNest <onboarding@resend.dev>",
          to: [to],
          subject,
          text,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || JSON.stringify(resData));
      }

      console.log("Email delivered via Resend API (HTTPS):", resData.id);
      return resData;
    } catch (apiError) {
      console.error("Resend API error:", apiError.message);
      throw apiError;
    }
  }

  // 2. BREVO API over HTTPS Port 443
  if (process.env.BREVO_API_KEY) {
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": process.env.BREVO_API_KEY.trim(),
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: "ShopNest",
            email: process.env.EMAIL_FROM || process.env.EMAIL_USER || "sumantkusahoo06@gmail.com",
          },
          to: [{ email: to }],
          subject,
          textContent: text,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || JSON.stringify(resData));
      }

      console.log("Email delivered via Brevo API (HTTPS):", resData.messageId);
      return resData;
    } catch (apiError) {
      console.error("Brevo API error:", apiError.message);
      throw apiError;
    }
  }

  // 3. SMTP (Nodemailer) - Works on local and cloud servers with open SMTP
  const emailUser = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : "";
  const emailPass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, "").trim() : "";

  if (isPlaceholder(emailUser) || isPlaceholder(emailPass)) {
    throw new Error(
      "No email service configured. Please provide RESEND_API_KEY, BREVO_API_KEY, or EMAIL_USER/EMAIL_PASS."
    );
  }

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  const transportConfig = {
    host,
    port,
    secure,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  };

  const transporter = nodemailer.createTransport(transportConfig);

  try {
    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || emailUser,
      to,
      subject,
      text,
    });

    console.log("Email accepted via SMTP:", result.messageId);
    console.log("Accepted recipients:", result.accepted);

    if (result.rejected && result.rejected.length > 0) {
      throw new Error("The email provider rejected the recipient.");
    }

    return result;
  } catch (error) {
    console.error("SMTP sending failed:", error.code, error.message);
    throw error;
  }
};

module.exports = sendEmail;
