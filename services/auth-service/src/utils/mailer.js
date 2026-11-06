import nodemailer from "nodemailer"

const smtpReady =
  process.env.MAIL_ENABLED !== "false" && process.env.SMTP_USER && process.env.SMTP_PASS

const transporter = smtpReady
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null

export const sendMail = async ({ to, subject, html }) => {
  if (!transporter) {
    const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1])
    console.log(`[mail not configured] to=${to} subject="${subject}" links=${JSON.stringify(links)}`)
    return
  }
  return transporter.sendMail({ from: process.env.MAIL_FROM, to, subject, html })
}