"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guards";
import { sendEmail } from "@/lib/email";
import { getSettings } from "@/lib/settings";
import type { ActionResult } from "@/components/admin/ActionForm";

export async function replyInquiry(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requirePermission("orders.manage");
  const id = String(form.get("id"));
  const inquiry = z.string().uuid().safeParse(id).success ? await db.query.inquiries.findFirst({ where: eq(schema.inquiries.id, id) }) : null;
  if (!inquiry) return { error: "Message introuvable." };
  const op = String(form.get("op"));
  if (op === "close" || op === "reopen") {
    await db.update(schema.inquiries).set({ status: op === "close" ? "closed" : "open" }).where(eq(schema.inquiries.id, id));
    revalidatePath("/admin/messages");
    return { ok: true, message: op === "close" ? "Marqué comme traité." : "Rouvert." };
  }
  const reply = String(form.get("reply") ?? "").trim();
  if (reply.length < 2 || reply.length > 5000) return { error: "Réponse vide ou trop longue." };
  const settings = await getSettings();
  await sendEmail({
    to: inquiry.email,
    subject: `Re: ${inquiry.subject}`,
    text: `${reply}\n\n— ${settings.store.name}\n\n> ${inquiry.message.split("\n").join("\n> ")}`,
    replyTo: settings.store.email,
  });
  await db.update(schema.inquiries).set({ status: "closed" }).where(eq(schema.inquiries.id, id));
  if (inquiry.orderId)
    await db.insert(schema.orderEvents).values({ orderId: inquiry.orderId, type: "note", message: `Réponse envoyée au client : ${reply.slice(0, 500)}`, userId: user.id, isInternal: true });
  await audit({ userId: user.id, action: "inquiry.reply", entityType: "inquiry", entityId: id });
  revalidatePath("/admin/messages");
  return { ok: true, message: "Réponse envoyée." };
}
