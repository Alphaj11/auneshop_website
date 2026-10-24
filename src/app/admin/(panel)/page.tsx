import Link from "next/link";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { Card, Empty, PageHeader, Stat, TestBadge } from "@/components/admin/ui";
import { requireStaffPage } from "@/lib/auth/guards";
import { StatusBadge, dateTimeFr } from "@/lib/labels";
import { formatPrice } from "@/lib/money";
import { expireStaleOrders } from "@/lib/orders";

export const metadata = { title: "Tableau de bord" };

const periods = { "7": "7 jours", "30": "30 jours", "90": "90 jours", "365": "12 mois" } as const;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ periode?: string; tests?: string; refus?: string }> }) {
  await requireStaffPage("dashboard.view");
  const sp = await searchParams;
  const days = Number(sp.periode && sp.periode in periods ? sp.periode : "30");
  const includeTests = sp.tests === "1";
  await expireStaleOrders().catch(() => 0);

  const since = daysAgo(days);
  const paidStatuses = ["paid", "partially_refunded"] as const;
  const base = and(
    gte(schema.orders.createdAt, since),
    inArray(schema.orders.paymentStatus, [...paidStatuses]),
    includeTests ? undefined : eq(schema.orders.isTest, false),
  );

  const [[kpi], daily, top, latest, lowStock, [testCount], [openInquiries]] = await Promise.all([
    db.select({ revenue: sql<number>`coalesce(sum(${schema.orders.totalCents}),0)::int`, count: sql<number>`count(*)::int` }).from(schema.orders).where(base),
    db
      .select({ day: sql<string>`to_char(date_trunc('day', ${schema.orders.createdAt} at time zone 'Europe/Paris'), 'YYYY-MM-DD')`, revenue: sql<number>`sum(${schema.orders.totalCents})::int` })
      .from(schema.orders)
      .where(base)
      .groupBy(sql`1`)
      .orderBy(sql`1`),
    db
      .select({ name: schema.orderItems.productName, qty: sql<number>`sum(${schema.orderItems.quantity})::int`, revenue: sql<number>`sum(${schema.orderItems.lineTotalCents})::int` })
      .from(schema.orderItems)
      .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
      .where(base)
      .groupBy(schema.orderItems.productName)
      .orderBy(desc(sql`sum(${schema.orderItems.quantity})`))
      .limit(5),
    db.query.orders.findMany({ orderBy: [desc(schema.orders.createdAt)], limit: 6, where: includeTests ? undefined : eq(schema.orders.isTest, false) }),
    db
      .select({ id: schema.productVariants.id, sku: schema.productVariants.sku, stock: schema.productVariants.stock, size: schema.productVariants.size, color: schema.productVariants.color, name: schema.products.name, productId: schema.products.id })
      .from(schema.productVariants)
      .innerJoin(schema.products, eq(schema.products.id, schema.productVariants.productId))
      .where(and(eq(schema.productVariants.trackInventory, true), eq(schema.productVariants.isActive, true), eq(schema.products.status, "active"), lte(schema.productVariants.stock, schema.productVariants.lowStockThreshold)))
      .orderBy(schema.productVariants.stock)
      .limit(8),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.orders).where(eq(schema.orders.isTest, true)),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.inquiries).where(eq(schema.inquiries.status, "open")),
  ]);

  // Série quotidienne complète (jours sans vente à 0).
  const map = new Map(daily.map((d) => [d.day, d.revenue]));
  const series = Array.from({ length: Math.min(days, 90) }, (_, i) => {
    const d = daysAgo(Math.min(days, 90) - 1 - i);
    const key = d.toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
    return { key, value: map.get(key) ?? 0 };
  });
  const max = Math.max(1, ...series.map((s) => s.value));
  const average = kpi.count ? Math.round(kpi.revenue / kpi.count) : 0;

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description={`Données réelles de la base — ${includeTests ? "commandes de test incluses" : "hors commandes de test"}.`}
        actions={
          <form className="flex flex-wrap items-center gap-2 text-sm">
            <label className="sr-only" htmlFor="periode">Période</label>
            <select id="periode" name="periode" defaultValue={String(days)} className="rounded border border-line bg-white px-3 py-1.5">
              {Object.entries(periods).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <label className="flex items-center gap-2"><input type="checkbox" name="tests" value="1" defaultChecked={includeTests} /> Inclure les tests</label>
            <button className="rounded bg-ink px-3 py-1.5 text-paper">Afficher</button>
          </form>
        }
      />
      {sp.refus && <p className="mb-6 rounded bg-danger/10 p-3 text-sm text-danger">Votre rôle ne donne pas accès à cette page.</p>}
      {!includeTests && testCount.n > 0 && (
        <p className="mb-6 rounded bg-vanille/40 p-3 text-sm">
          {testCount.n} commande(s) de test ou de démonstration existent et sont exclues des statistiques. <Link className="underline" href="?tests=1">Les inclure</Link>
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Chiffre d'affaires TTC" value={formatPrice(kpi.revenue)} hint={periods[String(days) as keyof typeof periods]} />
        <Stat label="Commandes payées" value={String(kpi.count)} />
        <Stat label="Panier moyen" value={kpi.count ? formatPrice(average) : "—"} />
        <Stat label="Messages à traiter" value={String(openInquiries.n)} hint="Formulaire de contact et questions" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Évolution des ventes" className="xl:col-span-2">
          {kpi.count === 0 ? (
            <Empty title="Aucune vente sur la période" text={includeTests ? undefined : "Les commandes de test ne sont pas comptées."} />
          ) : (
            <figure>
              <svg viewBox={`0 0 ${series.length * 10} 120`} className="h-48 w-full" preserveAspectRatio="none" role="img" aria-label="Chiffre d'affaires quotidien">
                {series.map((s, i) => (
                  <rect key={s.key} x={i * 10 + 1.5} width={7} y={120 - (s.value / max) * 110} height={(s.value / max) * 110} rx={1.5} className={s.value ? "fill-terre" : "fill-line"}>
                    <title>{`${s.key} : ${formatPrice(s.value)}`}</title>
                  </rect>
                ))}
              </svg>
              <figcaption className="mt-2 flex justify-between text-xs text-ink-mute"><span>{series[0]?.key}</span><span>max {formatPrice(max)} / jour</span><span>{series.at(-1)?.key}</span></figcaption>
            </figure>
          )}
        </Card>
        <Card title="Produits les plus vendus">
          {top.length === 0 ? <p className="text-sm text-ink-soft">Pas encore de ventes.</p> : (
            <ol className="space-y-3 text-sm">
              {top.map((t, i) => (
                <li key={t.name} className="flex items-center justify-between gap-3">
                  <span><span className="mr-2 text-ink-mute">{i + 1}.</span>{t.name}</span>
                  <span className="tabular-nums text-ink-soft">{t.qty} · {formatPrice(t.revenue)}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card title="Dernières commandes" className="xl:col-span-2" actions={<Link href="/admin/commandes" className="text-sm underline">Tout voir</Link>}>
          {latest.length === 0 ? <p className="text-sm text-ink-soft">Aucune commande.</p> : (
            <div className="-m-5 overflow-x-auto">
              <table className="admin-table">
                <tbody>
                  {latest.map((o) => (
                    <tr key={o.id}>
                      <td><Link href={`/admin/commandes/${o.id}`} className="font-medium underline-offset-2 hover:underline">{o.number}</Link> {o.isTest && <TestBadge />}</td>
                      <td className="text-ink-soft">{o.email}</td>
                      <td className="text-ink-soft">{dateTimeFr(o.createdAt)}</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td className="text-right tabular-nums">{formatPrice(o.totalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="Stock faible ou épuisé" actions={<Link href="/admin/stocks?filtre=faible" className="text-sm underline">Gérer</Link>}>
          {lowStock.length === 0 ? <p className="text-sm text-ink-soft">Aucune alerte.</p> : (
            <ul className="space-y-2 text-sm">
              {lowStock.map((v) => (
                <li key={v.id} className="flex justify-between gap-3">
                  <Link href={`/admin/produits/${v.productId}`} className="hover:underline">{v.name} <span className="text-ink-mute">{v.color} / {v.size}</span></Link>
                  <span className={`tabular-nums ${v.stock === 0 ? "text-danger" : "text-terre-ink"}`}>{v.stock === 0 ? "Épuisé" : v.stock}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400_000);
}
