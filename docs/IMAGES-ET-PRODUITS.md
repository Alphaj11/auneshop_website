# Remplacer les images et produits de démonstration

La démo contient 18 produits, 4 collections et des visuels **générés par code** (`npm run demo:assets`, fichiers SVG dans `public/demo/`). Aucune image du site actuel n'a été téléchargée ni réutilisée. Tout ce qui est fictif porte le badge « Exemple » côté boutique et la mention « Exemple » dans l'administration.

## 1. Les trois types d'images d'un produit

Chaque image téléversée dans **Admin › Produits › (produit) › Images** a un type et, idéalement, une couleur de variante :

| Type | Utilisation | Format conseillé |
| --- | --- | --- |
| **Galerie** | photos de la fiche produit, cartes produit (la 1re image est la principale, la 2e apparaît au survol) | JPEG ou WebP, portrait 4:5, 1600 × 2000 px |
| **Détouré** | la pièce seule, en orbite dans la scène immersive | PNG ou WebP **à fond transparent**, cadrage vertical, la pièce centrée |
| **Porté** | le mannequin (ou modèle) portant la pièce, affiché au centre quand on la sélectionne | PNG ou WebP transparent, même cadrage et même échelle pour tous les produits d'une collection |

Associez chaque image à une **couleur** : quand le visiteur change de coloris, la fiche et la scène affichent les images de cette couleur. Une image sans couleur sert pour toutes les couleurs.

Sans image « détouré », la scène utilise la première photo de galerie ; sans image « porté », le mannequin reste neutre. Une collection n'affiche la scène immersive qu'à partir de 3 produits ; sinon la grille est utilisée.

Formats acceptés : JPEG, PNG, WebP, AVIF, 8 Mo maximum. Le type réel du fichier est contrôlé ; les SVG téléversés sont refusés (risque de script).

Pour la scène immersive, l'idéal est une séance photo unique : même mannequin, même lumière, même distance, puis détourage. Le rendu est une présentation sur visuels préparés, **pas un essayage virtuel**, et la boutique l'indique.

## 2. Remplacer la démo par le vrai catalogue

1. **Catégories** : Admin › Produits › Catégories. Le rayon (femme, homme, mixte) place la catégorie dans le menu.
2. **Produits** : « Nouveau produit », ou modifier une fiche d'exemple.
   - Renseignez uniquement des informations vérifiées (matière, entretien, fabrication). Un champ vide n'apparaît pas sur la fiche.
   - Prix TTC en euros ; l'ancien prix barré doit être supérieur au prix actuel (contrôlé).
   - **Décochez « Donnée d'exemple »** pour retirer le badge.
3. **Variantes** : saisir les tailles et couleurs puis « Générer les combinaisons ». Pour chaque ligne : SKU unique, stock, suivi du stock (décochez pour une pièce fabriquée à la commande), seuil d'alerte, pastille de couleur.
4. **Images** : téléversez galerie, détourés et portés par couleur ; renseignez le texte alternatif (décrit l'image pour les personnes aveugles).
5. **Collections** : Admin › Collections. Ajoutez les produits, réglez l'ordre (celui de l'orbite et de la grille), la couleur d'ambiance, la couverture, le mode d'affichage, puis publiez. « Mettre à la une de l'accueil » l'affiche dans la section dédiée.
6. **Accueil** : Admin › Page d'accueil. Modifiez les sections en brouillon, vérifiez avec « Aperçu du brouillon », puis « Publier ». L'image du bandeau principal se remplace ici.
7. **Introduction animée** : Admin › Animations. Textes, comportement mobile et visuel du vêtement final (PNG transparent facultatif). Cochez « Rejouer l'introduction pour tous les visiteurs » après une modification importante.
8. **Nettoyage** : sélectionnez les produits d'exemple restants dans la liste et appliquez « Archiver » (ou « Supprimer définitivement » s'ils n'ont jamais été commandés). Archivez ou supprimez les collections d'exemple et les codes de réduction d'exemple (BIENVENUE10, ATELIER20, LIVRAISON).

## 3. Repartir d'une base vide (avant la mise en ligne)

Sur une base de production neuve, ne lancez pas `db:seed` :

```bash
npm run db:migrate
npm run db:init                                   # réglages et sections d'accueil par défaut, aucune donnée fictive
npm run admin:create -- --email vous@domaine.fr
```

Saisissez ensuite catégories, produits et collections, puis choisissez la collection à la une et l'image du bandeau dans l'éditeur de page d'accueil.

## 4. Régénérer les visuels de démonstration

```bash
npm run demo:assets
```

Le script `scripts/generate-demo-assets.ts` dessine les vêtements à partir de `src/lib/garments.ts` (même géométrie que l'animation d'introduction). Il n'a d'intérêt que pour la démo.
