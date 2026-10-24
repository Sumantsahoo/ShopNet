
const nodemailer = require("nodemailer");

const isPlaceholder = (value) =>
  !value ||
  value.startsWith("your_") ||
  value.includes("example.com") ||
  value.includes("yourgmail.com");

const sendEmail = async (to, subject, text) => {
  if (process.env.EMAIL_ENABLED === "false") {
    throw new Error("Email sending is disabled (EMAIL_ENABLED=false)");
  }

  // 1. BREVO API — try this first when configured
  if (process.env.BREVO_API_KEY) {
    try {
      const senderEmail =
        process.env.EMAIL_FROM || process.env.EMAIL_USER;

      if (!senderEmail || isPlaceholder(senderEmail)) {
        throw new Error(
          "Set EMAIL_FROM to a sender address verified in Brevo."
        );
      }

      const response = await fetch(
        "https://api.brevo.com/v3/smtp/email",
        {
          method: "POST",
          headers: {
            "api-key": process.env.BREVO_API_KEY.trim(),
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            sender: {
              name: "ShopNest",
              email: senderEmail.trim(),
            },
            to: [{ email: to }],
            subject,
            textContent: text,
          }),
        }
      );

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(
          resData.message || JSON.stringify(resData)
        );
      }

      console.log("Email accepted by Brevo:", resData.messageId);
      return resData;
    } catch (error) {
      console.error("Brevo API error:", error.message);
      throw error;
    }
  }

  // 2. RESEND API — fallback only when Brevo is not configured
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch(
        "https://api.resend.com/emails",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "ShopNest <onboarding@resend.dev>",
            to: [to],
            subject,
            text,
          }),
        }
      );

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(
          resData.message || JSON.stringify(resData)
        );
      }

      console.log("Email accepted by Resend:", resData.id);
      return resData;
    } catch (error) {
      console.error("Resend API error:", error.message);
      throw error;
    }
  }

  // 3. SMTP fallback
  const emailUser = process.env.EMAIL_USER
    ? process.env.EMAIL_USER.trim()
    : "";
  const emailPass = process.env.EMAIL_PASS
    ? process.env.EMAIL_PASS.replace(/\s+/g, "").trim()
    : "";

  if (isPlaceholder(emailUser) || isPlaceholder(emailPass)) {
    throw new Error(
      "No email service configured. Set BREVO_API_KEY, RESEND_API_KEY, or valid SMTP credentials."
    );
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  try {
    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || emailUser,
      to,
      subject,
      text,
    });

    if (result.rejected && result.rejected.length > 0) {
      throw new Error("The email provider rejected the recipient.");
    }

    console.log("Email accepted via SMTP:", result.messageId);
    return result;
  } catch (error) {
    console.error("SMTP sending failed:", error.code, error.message);
    throw error;
  }
};

module.exports = sendEmail;
