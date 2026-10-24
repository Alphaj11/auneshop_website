import "server-only";
import nodemailer from "nodemailer";

/**
 * Envoi d'emails transactionnels via SMTP (Brevo, Postmark, Mailjet, OVH…).
 * Sans SMTP_HOST, les emails sont écrits dans la console (développement).
 */

type Mail = { to: string; subject: string; text: string; html?: string; replyTo?: string };

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

export async function sendEmail(mail: Mail) {
  const from = process.env.EMAIL_FROM ?? "Aune <no-reply@auneshop.fr>";
  if (!process.env.SMTP_HOST) {
    console.info(`\n[email:dev] À: ${mail.to}\nSujet: ${mail.subject}\n${mail.text}\n`);
    return;
  }
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_PORT === "465",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  try {
    await transporter.sendMail({ from, ...mail, html: mail.html ?? wrapHtml(mail.text) });
  } catch (e) {
    // Un échec d'email ne doit jamais casser une commande : on journalise.
    console.error("[email] échec d'envoi", mail.subject, e);
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function wrapHtml(text: string) {
  const body = escapeHtml(text).replace(/\n/g, "<br>");
  return `<div style="font-family:Georgia,serif;background:#F4EFE6;padding:32px;color:#2A0B12"><div style="max-width:560px;margin:auto;background:#fff;border-radius:4px;overflow:hidden"><div style="background:#3E0913;padding:20px 32px"><img src="${appUrl("/brand/logo-blanc.png")}" alt="Aune" width="110" style="display:block;height:auto"></div><div style="padding:32px"><p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6">${body}</p></div></div></div>`;
}

export function appUrl(path = "") {
  return `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}${path}`;
}
