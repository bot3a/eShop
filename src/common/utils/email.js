import { createTransport } from "nodemailer";

import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const NODE_ENV = process.env.NODE_ENV || "development";

const host =
  NODE_ENV === "production" ? process.env.GMAIL_HOST : process.env.EMAIL_HOST;
const port =
  NODE_ENV === "production"
    ? Number(process.env.GMAIL_PORT)
    : Number(process.env.EMAIL_PORT);
const user =
  NODE_ENV === "production"
    ? process.env.GMAIL_USERNAME
    : process.env.EMAIL_USERNAME;
const pass =
  NODE_ENV === "production"
    ? process.env.GMAIL_PASSWORD
    : process.env.EMAIL_PASSWORD;

const secure = NODE_ENV === "production" ? true : false;

const sendEmail = async (options) => {
  //1 transporter
  const transporter = createTransport({
    host: host,
    port: port,
    secure: secure,
    auth: {
      user: user,
      pass: pass,
    },
  });

  //2options
  const mailOptions = {
    from: "ammard3v",
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  //3send email
  await transporter.sendMail(mailOptions);
};

export default sendEmail;
