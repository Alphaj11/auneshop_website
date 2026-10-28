"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guards";
import { appUrl, sendEmail } from "@/lib/email";
import { checkAttachments, fieldErrors, parseRequest, priorityLabels, replySchema, statusLabels, statusSchema, typeLabels } from "@/lib/qamar";
import { deleteImage, saveImage, UploadError } from "@/lib/storage";
import type { ActionResult } from "@/components/admin/ActionForm";

/** Prévient les concepteurs, seulement si un serveur SMTP et une adresse sont configurés. */
async function notifyDesigners(subject: string, text: string) {
  const to = process.env.DESIGNERS_EMAIL;
  if (!to || !process.env.SMTP_HOST) return;
  await sendEmail({ to, subject: `[Qamar] ${subject}`, text });
}

const findRequest = async (id: string) =>
  z.string().uuid().safeParse(id).success ? db.query.designerRequests.findFirst({ where: eq(schema.designerRequests.id, id) }) : undefined;

export async function createQamarRequest(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requirePermission("qamar.create");
  const parsed = parseRequest(form);
  if (!parsed.success) return { error: "Vérifiez le formulaire.", fieldErrors: fieldErrors(parsed.error) };
  const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  const fileError = checkAttachments(files);
  if (fileError) return { error: fileError, fieldErrors: { images: fileError } };

  const urls: string[] = [];
  try {
    for (const f of files) urls.push(await saveImage(f, "qamar"));
  } catch (e) {
    await Promise.all(urls.map(deleteImage));
    if (e instanceof UploadError) return { error: e.message, fieldErrors: { images: e.message } };
    throw e;
  }

  const data = parsed.data;
  const id = await db.transaction(async (tx) => {
    const [row] = await tx.insert(schema.designerRequests).values({ ...data, userId: user.id }).returning({ id: schema.designerRequests.id });
    if (urls.length) await tx.insert(schema.designerRequestAttachments).values(urls.map((url) => ({ requestId: row.id, url })));
    await audit({ userId: user.id, action: "qamar.create", entityType: "designer_request", entityId: row.id, data: { type: data.type, priority: data.priority, images: urls.length } }, tx);
    return row.id;
  });

  await notifyDesigners(
    `${typeLabels[data.type]} (${priorityLabels[data.priority].toLowerCase()}) : ${data.title}`,
    [
      `${user.firstName} ${user.lastName}`.trim() + ` (${user.email}) a déposé une demande.`,
      "",
      data.description,
      data.pageUrl ? `\nPage concernée : ${data.pageUrl}` : "",
      urls.length ? `\n${urls.length} image(s) jointe(s).` : "",
      `\nVoir la demande : ${appUrl(`/admin/qamar/${id}`)}`,
    ].join("\n"),
  );
  revalidatePath("/admin/qamar");
  redirect(`/admin/qamar/${id}?envoye=1`);
}

export async function replyQamarRequest(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requirePermission("qamar.create");
  const request = await findRequest(String(form.get("id")));
  if (!request) return { error: "Demande introuvable." };
  const parsed = replySchema.safeParse({ message: String(form.get("message") ?? "") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, fieldErrors: fieldErrors(parsed.error) };

  await db.insert(schema.designerRequestMessages).values({ requestId: request.id, userId: user.id, message: parsed.data.message });
  await db.update(schema.designerRequests).set({ updatedAt: new Date() }).where(eq(schema.designerRequests.id, request.id));
  await audit({ userId: user.id, action: "qamar.reply", entityType: "designer_request", entityId: request.id });
  await notifyDesigners(`Réponse : ${request.title}`, `${parsed.data.message}\n\nVoir la demande : ${appUrl(`/admin/qamar/${request.id}`)}`);
  revalidatePath(`/admin/qamar/${request.id}`);
  return { ok: true, message: "Message ajouté." };
}

export async function setQamarStatus(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requirePermission("qamar.manage");
  const request = await findRequest(String(form.get("id")));
  if (!request) return { error: "Demande introuvable." };
  const status = statusSchema.safeParse(form.get("status"));
  if (!status.success) return { error: "Statut inconnu." };
  if (status.data === request.status) return { ok: true, message: "Statut inchangé." };

  await db.update(schema.designerRequests).set({ status: status.data, updatedAt: new Date() }).where(eq(schema.designerRequests.id, request.id));
  await audit({ userId: user.id, action: "qamar.status", entityType: "designer_request", entityId: request.id, data: { from: request.status, to: status.data } });
  revalidatePath("/admin/qamar");
  revalidatePath(`/admin/qamar/${request.id}`);
  return { ok: true, message: `Statut : ${statusLabels[status.data].toLowerCase()}.` };
}
