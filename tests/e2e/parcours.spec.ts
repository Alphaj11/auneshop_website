import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

/**
 * Critères d'acceptation de la refonte, vérifiés dans un vrai navigateur
 * contre l'application en mode démonstration.
 */

const sql = postgres(process.env.DATABASE_URL!, { max: 2 });
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@exemple.test";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";
const CUSTOMER_EMAIL = "cliente@exemple.test";
const CUSTOMER_PASSWORD = process.env.DEMO_PASSWORD ?? "";
if (!ADMIN_PASSWORD || !CUSTOMER_PASSWORD) throw new Error("Définir E2E_ADMIN_PASSWORD (administrateur de test) et DEMO_PASSWORD avant les tests de bout en bout.");

test.describe.configure({ mode: "serial" });
test.use({ reducedMotion: "reduce" });
// Un même visiteur parcourt la boutique (tests 1 à 6) : son panier est conservé entre les étapes.
let shop: Page;
test.beforeAll(async ({ browser }) => {
  // Les limites anti-force brute (connexion, commande) s'appliquent aussi aux tests répétés.
  await sql`delete from rate_limits`;
  shop = await (await browser.newContext({ reducedMotion: "reduce" })).newPage();
});
test.afterAll(async () => {
  // Nettoyage des produits créés par le test (jamais commandés).
  await sql`delete from products where name like 'Robe e2e %'`;
  await shop.context().close();
  await sql.end();
});

async function adminLogin(page: Page) {
  await page.goto("/admin/connexion", { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Mot de passe").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /se connecter/i }).click();
  await page.waitForURL(/\/admin(\?|$)/);
}

async function fillCheckout(page: Page, v: { email: string; lastName: string; line1: string; postalCode: string; city: string }) {
  await page.locator('input[name="email"]').fill(v.email);
  await page.locator('input[name="firstName"]').fill("Test");
  for (const [k, val] of Object.entries(v)) if (k !== "email") await page.locator(`input[name="${k}"]`).fill(val);
  await page.locator('input[name="terms"]').check();
}

const stockOf = async (sku: string) => (await sql`select stock from product_variants where sku = ${sku}`)[0]?.stock as number;

let orderNumber = "";

test("1-4. Collection immersive : sélection, changement de tenue, ajout au panier depuis la scène", async () => {
  const page = shop;
  await page.goto("/collections/phir", { waitUntil: "networkidle" });
  const scene = page.getByRole("region", { name: "Collection en vue immersive" });
  await expect(scene).toBeVisible();
  const items = scene.getByRole("button", { name: /€/ });
  expect(await items.count()).toBeGreaterThanOrEqual(3);

  // Sélection d'une autre pièce : le panneau et le mannequin changent.
  const before = await page.getByTestId("orbit-panel").locator("h2").textContent();
  await page.getByRole("button", { name: "Pièce suivante" }).click();
  await expect(page.getByTestId("orbit-panel").locator("h2")).not.toHaveText(before ?? "");
  await expect(scene.getByText("Ce n'est pas un essayage virtuel", { exact: false })).toBeVisible();

  // Choix d'une taille disponible puis ajout au panier.
  const panel = page.getByTestId("orbit-panel");
  const size = panel.locator("fieldset").last().getByRole("button").and(page.locator(":not([disabled])")).first();
  if (await size.count()) await size.click();
  await panel.getByRole("button", { name: "Ajouter au panier" }).click();
  await expect(page.getByRole("button", { name: /Ouvrir le panier, [1-9]/ })).toBeVisible();

  // Le panier s'ouvre en tiroir ; on le referme, la grille classique reste disponible.
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Grille" }).click();
  await expect(page).toHaveURL(/vue=grille/);
});

test("3. Fiche produit : variantes, stock, ajout au panier", async () => {
  const page = shop;
  await page.goto("/produits/haut-malo", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Malo");
  await expect(page.getByText("Exemple").first()).toBeVisible();
  await page.getByRole("radiogroup", { name: "Taille" }).getByRole("radio").and(page.locator(":not([disabled])")).first().click();
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByRole("button", { name: /Ouvrir le panier, [2-9]/ })).toBeVisible();
});

test("5-6, 15. Commande en mode démonstration, payée seulement après confirmation simulée", async () => {
  const page = shop;
  const cartId = (await page.context().cookies()).find((c) => c.name === "aune_cart")?.value;
  expect(cartId).toBeTruthy();
  const lines = await sql`select quantity from cart_items where cart_id = ${cartId!}`;
  expect(lines.length).toBeGreaterThanOrEqual(1);

  await page.goto("/commande", { waitUntil: "networkidle" });
  await expect(page.getByText("Mode démonstration")).toBeVisible();
  await fillCheckout(page, { email: "e2e-invite@exemple.test", lastName: "Parcours", line1: "1 rue de l'Atelier", postalCode: "75011", city: "Paris" });
  await page.getByTestId("place-order").click();

  await page.waitForURL(/paiement-demo/);
  await expect(page.getByTestId("demo-payment")).toBeVisible();
  const orderId = page.url().match(/paiement-demo\/([0-9a-f-]{36})/)![1];
  const [pending] = await sql`select number, payment_status, is_test, stock_reserved from orders where id = ${orderId}`;
  expect(pending.payment_status).toBe("pending");
  expect(pending.is_test).toBe(true);
  expect(pending.stock_reserved).toBe(true);
  orderNumber = pending.number;

  await page.getByTestId("demo-pay-success").click();
  await page.waitForURL(/confirmation/);
  await expect(page.getByText(orderNumber)).toBeVisible();
  const [paid] = await sql`select payment_status, status from orders where id = ${orderId}`;
  expect(paid.payment_status).toBe("paid");
  // Le panier est vidé après paiement.
  await page.goto("/panier");
  await expect(page.getByText(/panier est vide/i)).toBeVisible();
});

test("11. Stock : la réservation décrémente, l'annulation restitue", async ({ page }) => {
  const [line] = await sql`select oi.quantity, v.sku, v.stock, v.track_inventory from order_items oi
    join orders o on o.id = oi.order_id join product_variants v on v.id = oi.variant_id where o.number = ${orderNumber} limit 1`;
  expect(line).toBeTruthy();
  const movements = await sql`select delta from inventory_movements m join orders o on o.id = m.order_id where o.number = ${orderNumber}`;
  if (line.track_inventory) expect(movements.reduce((n, m) => n + m.delta, 0)).toBeLessThan(0);

  // Commande non payée d'un article suivi en stock, puis annulée par l'admin : le stock revient.
  const [tracked] = await sql`select p.slug from products p where p.status = 'active' and not p.is_preorder
    and not exists (select 1 from product_variants v where v.product_id = p.id and not v.track_inventory)
    and exists (select 1 from product_variants v where v.product_id = p.id and v.stock > 2) limit 1`;
  await page.goto(`/produits/${tracked.slug}`, { waitUntil: "networkidle" });
  await page.getByRole("radiogroup", { name: "Taille" }).getByRole("radio").and(page.locator(":not([disabled])")).first().click();
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByRole("button", { name: /Ouvrir le panier, [1-9]/ })).toBeVisible();
  await page.goto("/commande", { waitUntil: "networkidle" });
  await fillCheckout(page, { email: "e2e-annulation@exemple.test", lastName: "Annulation", line1: "2 rue du Fil", postalCode: "69001", city: "Lyon" });
  await page.getByTestId("place-order").click();
  await page.waitForURL(/paiement-demo/);
  const orderId = page.url().match(/paiement-demo\/([0-9a-f-]{36})/)![1];
  const [item] = await sql`select v.sku, oi.quantity from order_items oi join product_variants v on v.id = oi.variant_id where oi.order_id = ${orderId}`;
  const reserved = await stockOf(item.sku);
  const [{ delta }] = await sql`select delta from inventory_movements where order_id = ${orderId}`;
  expect(delta).toBe(-item.quantity);

  await adminLogin(page);
  await page.goto(`/admin/commandes/${orderId}`);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Annuler la commande/ }).click();
  await expect(page.getByText(/annulée/i).first()).toBeVisible();
  await expect.poll(() => stockOf(item.sku)).toBe(reserved + item.quantity);
});

test("7, 17. La commande apparaît dans l'admin ; le statut payé ne s'obtient pas à la main", async ({ page }) => {
  await adminLogin(page);
  await page.goto(`/admin/commandes?q=${orderNumber}`);
  const row = page.getByRole("row", { name: new RegExp(orderNumber) });
  await expect(row).toBeVisible();
  await expect(row.getByText("Test", { exact: true })).toBeVisible();
  await row.getByRole("link", { name: orderNumber }).click();
  const statusSelect = page.locator('select[name="status"]');
  await expect(statusSelect).toBeVisible();
  expect(await statusSelect.locator('option[value="paid"]').count()).toBe(0);
  // Le tableau de bord exclut les commandes de test par défaut.
  await page.goto("/admin");
  await expect(page.getByText(/commande\(s\) de test ou de démonstration existent et sont exclues/)).toBeVisible();
});

test("8. Produit : création, modification, archivage", async ({ page }) => {
  await adminLogin(page);
  const name = `Robe e2e ${Date.now()}`;
  await page.goto("/admin/produits/nouveau");
  await page.getByLabel("Nom *").fill(name);
  await page.getByLabel("Prix TTC (€) *").fill("79,00");
  await page.getByLabel("Statut").selectOption("active");
  await page.getByRole("button", { name: "Créer le produit" }).click();
  await page.waitForURL(/\/admin\/produits\/[0-9a-f-]{36}/);

  // Variantes
  await page.getByPlaceholder("Couleurs : Écru, Terre").fill("Sable");
  await page.getByPlaceholder("Tailles : XS, S, M").fill("S, M");
  await page.getByRole("button", { name: "Générer les combinaisons" }).click();
  await page.getByRole("spinbutton", { name: "Stock" }).first().fill("4");
  await page.getByRole("button", { name: "Enregistrer les variantes" }).click();
  await expect(page.getByText(/2 variante\(s\) enregistrée/)).toBeVisible();

  // Modification du prix, visible côté boutique.
  await page.getByLabel("Prix TTC (€) *").fill("85,00");
  await page.getByRole("button", { name: "Enregistrer le produit" }).click();
  await expect(page.getByText("Produit enregistré.")).toBeVisible();
  const [p] = await sql`select slug, price_cents from products where name = ${name}`;
  expect(p.price_cents).toBe(8500);
  await page.goto(`/produits/${p.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(page.getByText("85,00").first()).toBeVisible();

  // Archivage : le produit disparaît de la boutique.
  await page.goBack();
  await page.goto(`/admin/produits?q=${encodeURIComponent(name)}`);
  await page.getByRole("link", { name: new RegExp(name) }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Archiver" }).click();
  await expect.poll(async () => (await sql`select status from products where name = ${name}`)[0].status).toBe("archived");
  // La fiche reste joignable pour les anciens liens, mais n'est plus achetable ni indexée, ni listée.
  await page.goto(`/produits/${p.slug}`);
  await expect(page.getByText("Cette pièce n'est plus disponible")).toBeVisible();
  await expect(page.getByTestId("add-to-cart")).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.goto(`/recherche?q=${encodeURIComponent(name)}`);
  await expect(page.locator(`a[href="/produits/${p.slug}"]`)).toHaveCount(0);
});

test("9. Collection : ajout d'un produit visible publiquement", async ({ page }) => {
  await adminLogin(page);
  const [c] = await sql`select id from collections where slug = 'aadmi'`;
  const [candidate] = await sql`select p.id, p.name from products p where p.status = 'active'
    and not exists (select 1 from collection_products cp where cp.product_id = p.id and cp.collection_id = ${c.id}) limit 1`;
  await page.goto(`/admin/collections/${c.id}`);
  const adder = page.locator("li", { hasText: candidate.name }).getByRole("button", { name: "Ajouter" });
  await adder.click();
  await page.getByRole("button", { name: "Enregistrer l'ordre" }).click();
  await expect(page.getByText(/produit\(s\) dans la collection/)).toBeVisible();
  await page.goto("/collections/aadmi?vue=grille");
  await expect(page.getByText(candidate.name).first()).toBeVisible();
});

test("10. Accueil : le brouillon n'est visible qu'après publication", async ({ page, browser }) => {
  await adminLogin(page);
  const title = `Titre e2e ${Date.now()}`;
  await page.goto("/admin/accueil");
  const hero = page.locator("details", { hasText: "Bandeau principal" });
  await hero.locator("summary").click();
  await hero.getByLabel("Titre", { exact: true }).fill(title);
  await hero.getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect(page.getByText(/Brouillon enregistré/)).toBeVisible();

  const visitor = await browser.newContext({ reducedMotion: "reduce" });
  const pub = await visitor.newPage();
  await pub.goto("/");
  await expect(pub.getByText(title)).toHaveCount(0);
  await page.goto("/?apercu=1");
  await expect(page.getByText(title).first()).toBeVisible();

  await page.goto("/admin/accueil");
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(page.getByText("Page d'accueil publiée.")).toBeVisible();
  await pub.goto("/");
  await expect(pub.getByText(title).first()).toBeVisible();
  await visitor.close();
});

test("12. Administration protégée côté serveur", async ({ page, request }) => {
  const anon = await page.goto("/admin/commandes");
  expect(page.url()).toContain("/admin/connexion");
  expect(anon?.status()).toBeLessThan(500);

  // Un client connecté n'accède pas à l'administration.
  await page.goto("/connexion", { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(CUSTOMER_EMAIL);
  await page.getByLabel("Mot de passe").fill(CUSTOMER_PASSWORD);
  await page.getByRole("button", { name: /se connecter/i }).click();
  await page.waitForURL(/\/compte/);
  await page.goto("/admin/produits");
  expect(new URL(page.url()).pathname).not.toBe("/admin/produits");

  // Exports protégés même avec l'URL directe.
  // Client connecté : refus du serveur ; visiteur anonyme : redirection vers la connexion, jamais de CSV.
  expect((await page.request.get("/admin/commandes/export")).status()).toBe(403);
  const anonExport = await request.get("/admin/commandes/export", { maxRedirects: 0 });
  expect([307, 308, 403]).toContain(anonExport.status());
  expect(anonExport.headers()["content-type"] ?? "").not.toContain("text/csv");
});

test("13. Mobile : grille accessible, aucune erreur", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/collections/phir?vue=grille");
  await expect(page.getByRole("tab", { name: "Grille" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("link", { name: /Léa/ }).first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
  await ctx.close();
});

test("16. Introduction : jouée une fois, ignorable, absente si mouvement réduit", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "no-preference" });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.getByTestId("intro")).toBeVisible();
  await page.getByRole("button", { name: /Passer/ }).click();
  await expect(page.getByTestId("intro")).toHaveCount(0);
  await page.goto("/");
  await expect(page.getByTestId("intro")).toHaveCount(0);
  await ctx.close();

  const reduced = await browser.newContext({ reducedMotion: "reduce" });
  const p2 = await reduced.newPage();
  await p2.goto("/");
  await p2.waitForTimeout(500);
  await expect(p2.getByTestId("intro")).toHaveCount(0);
  await reduced.close();
});

test("14. Aucun secret exposé ; webhook non signé refusé", async ({ page, request }) => {
  const secrets = [process.env.SESSION_SECRET, process.env.STRIPE_SECRET_KEY, process.env.STRIPE_WEBHOOK_SECRET, process.env.DATABASE_URL].filter(Boolean) as string[];
  const scripts: string[] = [];
  page.on("response", async (r) => {
    if (r.url().endsWith(".js")) scripts.push(await r.text().catch(() => ""));
  });
  await page.goto("/");
  await page.goto("/commande", { waitUntil: "networkidle" });
  const html = await page.content();
  for (const s of secrets) {
    expect(html).not.toContain(s);
    for (const js of scripts) expect(js).not.toContain(s);
  }
  for (const js of scripts) expect(js).not.toMatch(/sk_(live|test)_[A-Za-z0-9]{10,}/);

  const res = await request.post("/api/webhooks/stripe", { data: '{"type":"checkout.session.completed"}', headers: { "content-type": "application/json", "stripe-signature": "t=1,v1=faux" } });
  expect(res.status()).toBeGreaterThanOrEqual(400);
});

test("Administration : chaque écran se charge sans erreur", async ({ page }) => {
  await adminLogin(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const [p] = await sql`select id from products where status = 'active' limit 1`;
  const [c] = await sql`select id from collections limit 1`;
  const [o] = await sql`select id from orders limit 1`;
  const [u] = await sql`select id from users where role = 'customer' and anonymized_at is null limit 1`;
  const paths = [
    "/admin", "/admin/commandes", `/admin/commandes/${o.id}`, "/admin/produits", "/admin/produits/nouveau", `/admin/produits/${p.id}`,
    "/admin/produits/categories", "/admin/collections", "/admin/collections/nouvelle", `/admin/collections/${c.id}`, "/admin/stocks",
    "/admin/clients", `/admin/clients/${u.id}`, "/admin/reductions", "/admin/accueil", "/admin/experience", "/admin/messages",
    "/admin/messages?vue=newsletter", "/admin/reglages", "/admin/equipe", "/admin/journal", "/admin/recherche?q=ama",
  ];
  for (const path of paths) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.locator("h1").first(), path).toBeVisible();
  }
  expect(errors).toEqual([]);
  // Les réglages n'affichent jamais la valeur des secrets.
  await page.goto("/admin/reglages");
  const html = await page.content();
  for (const s of [process.env.SESSION_SECRET, process.env.STRIPE_SECRET_KEY, process.env.STRIPE_WEBHOOK_SECRET].filter(Boolean) as string[]) expect(html).not.toContain(s);
});
