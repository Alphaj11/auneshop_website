# Architecture

## Arborescence

```
auneshop/
├── drizzle/                     migrations SQL versionnées (0000_init, 0001_order_cart) + métadonnées
├── public/demo/                 visuels de démonstration générés (SVG), remplaçables
├── scripts/
│   ├── seed.ts                  données de démonstration (refusé en production) ; --reset pour repartir de zéro
│   ├── init.ts                  initialisation d'une base neuve sans données fictives (production)
│   ├── create-admin.ts          création / promotion sécurisée d'un administrateur
│   ├── demo-catalog.ts          catalogue fictif (18 produits, 4 collections)
│   └── generate-demo-assets.ts  génération des visuels SVG de démonstration
├── src/
│   ├── proxy.ts                 redirection rapide de /admin sans session (la vraie vérification est côté serveur)
│   ├── db/                      schéma Drizzle (28 tables) et connexion PostgreSQL
│   ├── lib/
│   │   ├── auth/                sessions, mots de passe Argon2id, jetons, rôles et permissions, gardes serveur
│   │   ├── payments/stripe.ts   création des sessions Stripe Checkout
│   │   ├── orders.ts            création de commande, réservation de stock, paiement, annulation, expiration
│   │   ├── cart.ts, catalog.ts  panier persistant, lecture du catalogue
│   │   ├── pricing.ts, money.ts calculs en centimes (totaux, TVA incluse, réductions, livraison)
│   │   ├── settings*.ts         réglages de la boutique (validés par zod)
│   │   ├── storage.ts           images : disque local ou S3, contrôle du type réel des fichiers
│   │   ├── gdpr.ts              export et effacement des données d'un client
│   │   ├── garments.ts          géométrie des vêtements (intro animée et visuels de démo)
│   │   └── email.ts, audit.ts, rate-limit.ts, csv.ts, slug.ts…
│   ├── app/
│   │   ├── (boutique)/          pages publiques : accueil, collections, produits, panier, commande, compte, pages légales
│   │   ├── admin/               connexion et administration (groupe (panel) protégé)
│   │   ├── admin/actions/       actions serveur de l'administration (chacune vérifie sa permission)
│   │   ├── actions/             actions serveur publiques (panier, commande, compte, newsletter…)
│   │   ├── api/webhooks/stripe  réception signée des événements Stripe
│   │   ├── api/cron/            expiration des commandes impayées (protégée par secret)
│   │   ├── media/[...path]      service des images téléversées en local
│   │   └── sitemap.ts, robots.ts
│   └── components/
│       ├── immersive/           Intro (canvas 2D), OrbitScene (scène orbitale), CollectionExperience
│       ├── home/                sections de l'accueil
│       ├── shop/                en-tête, pied de page, cartes et fiche produit, panier, tunnel
│       ├── account/             formulaires du compte client
│       ├── admin/               coque, formulaires et éditeurs de l'administration
│       └── ui/                  composants partagés (préférence de mouvement, notifications, champs…)
├── tests/
│   ├── pricing.test.ts          tests unitaires (Vitest)
│   └── e2e/parcours.spec.ts     critères d'acceptation (Playwright)
├── .env.example                 variables d'environnement documentées
└── next.config.ts               en-têtes de sécurité, images, configuration Turbopack
```

## Modèle de données (PostgreSQL)

| Domaine | Tables |
| --- | --- |
| Comptes | `users` (rôle, actif, anonymisé), `sessions` (empreinte SHA-256 du jeton), `password_reset_tokens`, `customer_profiles`, `addresses`, `wishlist_items` |
| Catalogue | `categories`, `products`, `product_images` (galerie / détouré / porté, par couleur), `product_variants` (SKU unique, stock ≥ 0), `collections`, `collection_products` (ordre), `inventory_movements` (historique de chaque mouvement) |
| Vente | `carts`, `cart_items`, `discounts`, `orders` (numéro AU-100001…, montants, adresse figée, mode de paiement, `is_test`), `order_items` (**instantané** : nom, variante, SKU, prix au moment de l'achat), `order_events` (historique et notes internes), `payments`, `shipments`, `webhook_events` |
| Contenu | `homepage_sections` (version publiée + brouillon), `store_settings`, `newsletter_subscribers` (texte et date du consentement), `inquiries` |
| Sécurité | `audit_logs`, `rate_limits` |

Principes :

- **Montants en centimes entiers** partout (aucun flottant), prix TTC, TVA incluse calculée pour l'affichage et les exports.
- **Instantané de commande** : modifier ou supprimer un produit ne change jamais une commande passée.
- **Stock** : réservé à la création de la commande par une mise à jour atomique (`stock = stock - n WHERE stock >= n`), rendu en cas d'annulation, d'échec ou d'expiration ; chaque mouvement est tracé.
- **Contraintes en base** : prix positifs, ancien prix supérieur au prix, stock jamais négatif, quantités bornées, SKU et combinaisons taille/couleur uniques, codes promo uniques sans tenir compte de la casse.
- **Commandes de test isolées** : `is_test = true` pour le mode démo et Stripe test ; exclues des statistiques, signalées partout, jamais expédiées ni remboursées réellement.

## Sécurité

- Mots de passe hachés en Argon2id ; temps de réponse identique que l'email existe ou non ; pas d'énumération des comptes à la réinitialisation.
- Sessions : jeton aléatoire en cookie `httpOnly`, `SameSite=Lax`, `Secure` en production ; seule son empreinte est stockée. 30 jours pour les clients, 12 h pour l'équipe. Changement de rôle, désactivation ou mot de passe modifié = déconnexion.
- Limitation des tentatives (connexion, inscription, réinitialisation, commande) stockée en base.
- Permissions vérifiées côté serveur dans chaque page et action d'administration ; masquer une URL n'est pas considéré comme une protection.
- Aucun compte administrateur par défaut ; création par script avec mot de passe saisi hors historique.
- Aucune clé privée côté navigateur (aucune variable `NEXT_PUBLIC_`), aucun secret affiché dans l'administration.
- Paiement : page hébergée par Stripe (aucun numéro de carte sur le serveur), statut « payé » uniquement via webhook signé avec contrôle du montant, webhooks idempotents ; mode démo bloqué en production sauf autorisation explicite.
- Téléversements : type déterminé par le contenu (JPEG, PNG, WebP, AVIF), SVG refusés, 8 Mo maximum, noms de fichiers aléatoires, protection contre la traversée de chemin.
- Liens saisis dans l'administration limités à des chemins internes ou `https://`.
- Exports CSV protégés contre l'injection de formules ; journal d'audit des actions sensibles.
- En-têtes : Content-Security-Policy, HSTS (production), X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy.
- RGPD : consentement newsletter horodaté avec son texte, désinscription par lien, export JSON et effacement des données client (commandes conservées pour la comptabilité, détachées du compte).
