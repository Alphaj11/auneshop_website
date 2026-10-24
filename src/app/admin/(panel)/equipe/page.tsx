import { desc, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { Card, PageHeader, btnDangerSm, btnSm, inputCls } from "@/components/admin/ui";
import { inviteMember, updateMember } from "@/app/admin/actions/team";
import { requireStaffPage } from "@/lib/auth/guards";
import { roleLabels } from "@/lib/auth/permissions";
import { dateTimeFr } from "@/lib/labels";

export const metadata = { title: "Équipe et rôles" };

const roleHelp = {
  order_manager: "Commandes (traitement, expédition, notes, export), lecture des clients et des messages.",
  store_manager: "Tout le catalogue, collections, stocks, contenus, animations, commandes et remboursements.",
  super_admin: "Tout, y compris réglages, équipe, données clients (RGPD) et journal d'audit.",
};

export default async function TeamAdmin() {
  const me = await requireStaffPage("team.manage");
  const members = await db.query.users.findMany({
    where: ne(schema.users.role, "customer"),
    orderBy: [desc(schema.users.createdAt)],
    columns: { passwordHash: false },
  });
  return (
    <>
      <PageHeader title="Équipe et rôles" description="Les droits sont vérifiés côté serveur à chaque action, pas seulement dans le menu." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {members.map((m) => (
            <div key={m.id} className="rounded-lg border border-line bg-white/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{[m.firstName, m.lastName].filter(Boolean).join(" ") || m.email} {m.id === me.id && <span className="text-xs text-ink-mute">(vous)</span>}</p>
                  <p className="text-sm text-ink-soft">{m.email}</p>
                  <p className="mt-1 text-xs text-ink-mute">{m.isActive ? "Actif" : "Désactivé"} · dernière connexion : {m.lastLoginAt ? dateTimeFr(m.lastLoginAt) : "jamais"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ActionForm action={updateMember} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={m.id} />
                    <select name="role" defaultValue={m.role} className={`${inputCls} !w-auto !py-1.5`} aria-label={`Rôle de ${m.email}`}>
                      <option value="order_manager">{roleLabels.order_manager}</option>
                      <option value="store_manager">{roleLabels.store_manager}</option>
                      <option value="super_admin">{roleLabels.super_admin}</option>
                      <option value="customer">Retirer l&apos;accès (client)</option>
                    </select>
                    <Submit className={btnSm} name="op" value="role">Changer</Submit>
                  </ActionForm>
                  {m.id !== me.id && (
                    <ActionForm action={updateMember} className="flex gap-2">
                      <input type="hidden" name="id" value={m.id} />
                      <Submit className={btnSm} name="op" value="logout">Déconnecter</Submit>
                      {m.isActive ? <Submit className={btnDangerSm} name="op" value="deactivate">Désactiver</Submit> : <Submit className={btnSm} name="op" value="activate">Réactiver</Submit>}
                    </ActionForm>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <Card title="Inviter un membre">
            <ActionForm action={inviteMember} resetOnSuccess className="space-y-3">
              <input name="email" type="email" required placeholder="Email" className={inputCls} aria-label="Email" />
              <div className="grid grid-cols-2 gap-2">
                <input name="firstName" placeholder="Prénom" className={inputCls} aria-label="Prénom" />
                <input name="lastName" placeholder="Nom" className={inputCls} aria-label="Nom" />
              </div>
              <select name="role" defaultValue="order_manager" className={inputCls} aria-label="Rôle">
                <option value="order_manager">{roleLabels.order_manager}</option>
                <option value="store_manager">{roleLabels.store_manager}</option>
                <option value="super_admin">{roleLabels.super_admin}</option>
              </select>
              <Submit className="w-full rounded bg-ink px-4 py-2 text-sm text-paper">Envoyer l&apos;invitation</Submit>
            </ActionForm>
          </Card>
          <Card title="Rôles">
            <dl className="space-y-3 text-sm">
              {Object.entries(roleHelp).map(([k, v]) => (
                <div key={k}><dt className="font-medium">{roleLabels[k as keyof typeof roleHelp]}</dt><dd className="text-ink-soft">{v}</dd></div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
