
const nodemailer = require("nodemailer");

const isPlaceholder = (value) =>
  !value ||
  value.startsWith("your_") ||
  value.includes("example.com") ||
  value.includes("yourgmail.com");

const sendEmail = async (to, subject, text) => {
  if (process.env.EMAIL_ENABLED === "false") {
    throw new Error("Email sending is disabled in .env");
  }

  if (
    isPlaceholder(process.env.EMAIL_USER) ||
    isPlaceholder(process.env.EMAIL_PASS)
  ) {
    throw new Error(
      "Configure EMAIL_USER and EMAIL_PASS in server/.env"
    );
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== "false",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    await transporter.verify();

    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text,
    });

    console.log("Email accepted:", result.messageId);
    console.log("Accepted recipients:", result.accepted);

    if (result.rejected.length > 0) {
      throw new Error("The email provider rejected the recipient.");
    }

    return result;
  } catch (error) {
    console.error("Email sending failed:", error.code, error.message);
    throw error;
  }
};

module.exports = sendEmail;
