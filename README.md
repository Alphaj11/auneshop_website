# Aune — boutique en ligne

Refonte complète de auneshop.fr, **indépendante de Shopify** : catalogue, panier, commande, paiement Stripe, comptes clients et administration sont hébergés dans cette application et sa base PostgreSQL.

- **Stack** : Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Motion · PostgreSQL 16 · Drizzle ORM · Stripe Checkout
- **Signature** : introduction animée « Le vêtement prend vie » et collections immersives (mannequin central, pièces en orbite), avec une grille classique toujours disponible.
- **Données de démonstration** : 18 produits et 4 collections fictifs, marqués « Exemple », avec des visuels générés (aucune image du site actuel n'est réutilisée).

Documentation complémentaire :

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) : arborescence, modèle de données, choix de sécurité
- [docs/IMAGES-ET-PRODUITS.md](docs/IMAGES-ET-PRODUITS.md) : remplacer les visuels et produits de démonstration

---

## 1. Installation (développement)

Prérequis : Node.js 22+, PostgreSQL 16+.

```bash
npm install
cp .env.example .env            # puis compléter DATABASE_URL, SESSION_SECRET (openssl rand -hex 32), DEMO_PASSWORD
createdb auneshop               # ou via votre outil PostgreSQL
npm run db:migrate              # crée les tables (migrations dans drizzle/)
npm run demo:assets             # génère les visuels de démonstration dans public/demo/
npm run db:seed                 # catalogue, collections, contenus, client et commandes de démonstration
npm run admin:create -- --email vous@domaine.fr   # premier administrateur (voir §3)
npm run dev                     # http://localhost:3000
```

Repartir d'une base propre : `npm run db:reset` (vide toutes les tables, y compris les comptes, puis recharge la démo ; refusé en production). Recréez ensuite l'administrateur.

Compte client de démonstration : `cliente@exemple.test`, mot de passe = valeur de `DEMO_PASSWORD`.

## 2. Commandes utiles

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` puis `npm start` | build et serveur de production |
| `npm run typecheck` | vérification TypeScript |
| `npm run lint` | ESLint |
| `npm test` | tests unitaires (calcul des totaux, TVA, réductions, livraison) |
| `npm run test:e2e` | tests de bout en bout Playwright (voir §8) |
| `npm run db:generate` | génère une migration après modification de `src/db/schema.ts` |
| `npm run db:migrate` | applique les migrations |
| `npm run db:init` | initialise une base neuve sans données de démonstration (production) |

## 3. Créer le premier administrateur

Aucun compte administrateur n'est créé par défaut, ni en développement ni en production.

```bash
npm run admin:create -- --email vous@domaine.fr --role super_admin
```

Le mot de passe (12 caractères minimum) est demandé dans le terminal : il n'apparaît ni dans l'historique ni dans les journaux. En environnement non interactif, il peut être passé par la variable `ADMIN_PASSWORD`. Si l'email existe déjà, le compte est promu et ses sessions sont fermées.

Connexion : `/admin/connexion`. Les autres membres s'invitent ensuite depuis **Admin › Équipe et rôles** (lien d'activation valable 72 h).

| Rôle | Accès |
| --- | --- |
| Gestionnaire de commandes | commandes (traitement, expédition, notes, export), lecture des clients et messages |
| Gestionnaire de boutique | + catalogue, collections, stocks, réductions, page d'accueil, animations, remboursements |
| Super administrateur | tout, y compris réglages, équipe, RGPD et journal d'audit |

Les droits sont vérifiés côté serveur dans chaque page et chaque action (`requireStaffPage`, `requirePermission`), pas seulement dans le menu.

## 4. Configurer le paiement (Stripe)

Par défaut, la boutique est en **mode démonstration** : la page de paiement est simulée, les commandes sont marquées « Test » et exclues des statistiques. **En production, le mode démonstration bloque toute commande** (sauf `ALLOW_DEMO_CHECKOUT=true`, à réserver à un site de présentation).

Passage à Stripe :

1. Créez un compte sur stripe.com et récupérez la **clé secrète** (`sk_test_…` pour tester, `sk_live_…` en production).
2. Dans Stripe › Développeurs › Webhooks, ajoutez le point de terminaison `https://VOTRE-DOMAINE/api/webhooks/stripe` avec les événements :
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`.
   Copiez le **secret de signature** (`whsec_…`).
3. Définissez sur le serveur :
   ```
   PAYMENT_MODE=stripe
   STRIPE_SECRET_KEY=sk_live_…
   STRIPE_WEBHOOK_SECRET=whsec_…
   ```
4. Vérifiez dans **Admin › Réglages › Intégrations** que tout est au vert (seule la présence des clés est affichée, jamais leur valeur).

En local, pour recevoir les webhooks : `stripe listen --forward-to localhost:3000/api/webhooks/stripe` (le secret `whsec_` affiché va dans `.env`), puis carte de test `4242 4242 4242 4242`.

Garanties de sécurité du paiement :

- les numéros de carte sont saisis uniquement sur la page hébergée par Stripe et ne transitent jamais par le serveur de la boutique ;
- une commande ne passe à « payée » **que** sur réception d'un webhook dont la signature est vérifiée et dont le montant correspond ; le retour du navigateur sur la page de confirmation ne fait qu'afficher l'état lu en base ;
- aucun statut « payé » ne peut être choisi à la main dans l'administration ;
- les webhooks sont idempotents (table `webhook_events`) ;
- les remboursements passent par l'API Stripe ; pour une commande de démonstration, le remboursement est simulé et rien n'est envoyé à Stripe.

## 5. Déploiement

L'application est un serveur Node.js classique avec une base PostgreSQL. Options courantes :

- **Vercel / Netlify + PostgreSQL managé** (Neon, Supabase, Scaleway…) : définir les variables d'environnement, utiliser `STORAGE_DRIVER=s3` (le disque n'est pas persistant).
- **VPS ou PaaS** (Scalingo, Clever Cloud, Render, Docker) : `npm ci && npm run build && npm run db:migrate && npm start`. Le stockage local (`UPLOAD_DIR`) convient si le dossier est persistant et sauvegardé.

Points à ne pas oublier :

1. `APP_URL` = l'URL publique en https ; `SESSION_SECRET` aléatoire de 32 caractères minimum.
2. Migrations : `npm run db:migrate` à chaque déploiement qui modifie le schéma.
3. **Ne lancez pas le seed en production** (il est refusé). Sur une base neuve : `npm run db:init` (réglages et sections d'accueil par défaut, sans données fictives, sans effet si déjà initialisé), puis créez l'administrateur (§3) et vos produits.
4. Tâche planifiée toutes les 15 minutes, qui libère le stock des commandes jamais payées :
   `curl -H "Authorization: Bearer $CRON_SECRET" https://VOTRE-DOMAINE/api/cron/expire-orders`
   (l'expiration est aussi déclenchée à chaque commande et à l'ouverture du tableau de bord).
5. Emails : configurez `SMTP_*` et `EMAIL_FROM` (sans SMTP, les emails sont seulement écrits dans les journaux).
6. Images : `STORAGE_DRIVER=s3` et `S3_*` pour un stockage objet (AWS, Scaleway, OVH, Cloudflare R2…).
7. Sauvegardes : `pg_dump` quotidien de la base (rétention 30 jours conseillée) et sauvegarde du dossier d'images si stockage local. Testez une restauration.
8. En-têtes de sécurité (CSP, HSTS, X-Frame-Options…) sont définis dans `next.config.ts`.

## 6. Remplacer les images et produits de démonstration

Voir [docs/IMAGES-ET-PRODUITS.md](docs/IMAGES-ET-PRODUITS.md). En bref : dans l'administration, créez vos vrais produits (ou modifiez les fiches d'exemple), téléversez vos photos pour chaque couleur (galerie, détouré, porté), décochez « Donnée d'exemple », puis archivez les produits d'exemple restants.

## 7. Contenus et pages légales

Les pages légales (mentions légales, CGV, confidentialité, cookies, livraison et retours) sont des **modèles** alimentés par **Admin › Réglages › Informations légales**. Elles ne constituent pas un avis juridique et **doivent être relues par un professionnel** avant la mise en ligne : la conformité légale du site n'a pas été vérifiée.

Les informations produit d'exemple (matières, fabrication, délais) sont fictives et signalées comme telles. N'indiquez sur les vraies fiches que des informations vérifiées : aucune certification, matière ou mention éthique ne doit être ajoutée sans justificatif.

## 8. Tests

- `npm test` : 11 tests unitaires sur le calcul des montants en centimes.
- `npm run test:e2e` : 13 tests Playwright couvrant les critères d'acceptation (collection immersive, fiche produit, panier, commande démo, stock, administration, contenus, protection, mobile, introduction, secrets). Prérequis : base peuplée (`npm run db:reset`), administrateur créé, application lancée en mode démo. Variables : `E2E_ADMIN_PASSWORD` (obligatoire), `E2E_ADMIN_EMAIL` (par défaut admin@exemple.test), `DEMO_PASSWORD`, `PW_CHROMIUM_PATH`. Les tests créent des commandes de test et modifient le titre du bandeau d'accueil : à lancer sur une base de développement uniquement.

## 9. État du projet

### Terminé et vérifié

- Boutique : accueil éditorial modulable, collections immersives et en grille, catalogue avec filtres, recherche, fiche produit (galerie, zoom, variantes, stock, guide des tailles, favoris, suggestions), panier persistant, codes de réduction, livraison offerte au-delà d'un seuil.
- Introduction animée en 4 temps, ignorable, jouée une seule fois par version, désactivée si le visiteur demande moins d'animations, version allégée sur mobile et appareils modestes, réglable dans l'admin.
- Commande invitée ou connectée, réservation atomique du stock, expiration des commandes impayées, paiement Stripe Checkout + webhooks signés, mode démonstration séparé, emails transactionnels.
- Comptes clients : inscription, connexion, mot de passe oublié, profil, adresses, commandes et suivi, favoris, questions sur une commande, suppression du compte (RGPD).
- Administration : tableau de bord sur données réelles (hors tests), commandes (filtres, statuts, expéditions, notes internes, remboursements, annulation, export CSV), produits (CRUD, variantes, images, actions groupées, duplication, archivage), catégories, collections (ordre, mode immersif/grille, mise à la une), éditeur de page d'accueil avec brouillon et aperçu, animations, stocks et historique, clients (export et effacement RGPD), réductions, messages et newsletter, réglages, équipe et rôles, journal d'audit, recherche globale.
- SEO : sitemap, robots, balises canoniques, JSON-LD (boutique, produit, collection, FAQ), métadonnées par page.
- Vérifications exécutées : `typecheck`, `lint` (0 erreur), `npm test` (11/11), `npm run build`, `npm run test:e2e` (13/13).

### Reste à faire avant la mise en ligne

- Fournir le logo, les couleurs exactes de la marque, les vraies photos et fiches produits.
- Faire relire et compléter les pages légales et les informations de l'entreprise.
- Configurer Stripe en production, le SMTP, le stockage d'images et les sauvegardes ; tester un vrai paiement de faible montant puis le rembourser.
- Rediriger les anciennes URL Shopify (`/products/…`, `/collections/…`) vers les nouvelles si les adresses changent, puis basculer le domaine.
- Audit d'accessibilité complet avec lecteur d'écran (les bases sont en place : navigation clavier, libellés, contrastes, mouvement réduit) et test sur appareils réels.
- Facturation : la boutique n'émet pas de factures PDF ; à brancher sur votre outil comptable si nécessaire.
- Non inclus volontairement : essayage virtuel 3D (la scène immersive utilise des visuels 2D préparés et le dit clairement).
