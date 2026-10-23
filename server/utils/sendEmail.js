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

  const emailUser = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : "";
  const emailPass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, "").trim() : "";

  if (isPlaceholder(emailUser) || isPlaceholder(emailPass)) {
    throw new Error(
      "EMAIL_USER or EMAIL_PASS is not configured in environment variables."
    );
  }

  const isGmail = !process.env.SMTP_HOST || process.env.SMTP_HOST.includes("gmail");

  const transportConfig = isGmail
    ? {
        service: "gmail",
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
      }
    : {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 465),
        secure: process.env.SMTP_SECURE !== "false",
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
      };

  const transporter = nodemailer.createTransport(transportConfig);

  try {
    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || emailUser,
      to,
      subject,
      text,
    });

    console.log("Email accepted:", result.messageId);
    console.log("Accepted recipients:", result.accepted);

    if (result.rejected && result.rejected.length > 0) {
      throw new Error("The email provider rejected the recipient.");
    }

    return result;
  } catch (error) {
    console.error("Email sending failed:", error.code, error.message);
    throw error;
  }
};

module.exports = sendEmail;
