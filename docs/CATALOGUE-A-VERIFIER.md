# Catalogue Aune : points à vérifier

Le catalogue de départ (`scripts/demo-catalog.ts`) reprend 15 vraies pièces Aune issues du
catalogue de travail de la marque (collections Phir, Surya, Aadmi). Noms, prix, collections et
descriptions en viennent. Avant la mise en production, il reste à confirmer :

| Pièce | Collection | À confirmer |
| --- | --- | --- |
| Haut Malo | Phir | description, tailles, coloris |
| Veste Nico | Phir | tailles, coloris des deux faces |
| Chloé | Surya | type de pièce, description, tailles, coloris |
| Jeannine | Surya | description, tailles, coloris |
| Romain | Aadmi | description, tailles, coloris |
| Alain | Aadmi | description, tailles, coloris |

Ces six pièces gardent le badge « Exemple » sur le site tant que leurs informations ne sont pas
complétées (décochez « Donnée d'exemple » dans l'admin une fois la fiche vérifiée). Les coloris
inconnus s'affichent « À confirmer ».

Pour toutes les pièces :

- **Visuels** : ce sont encore des illustrations générées. Remplacez-les par les photos de la marque
  (voir `docs/IMAGES-ET-PRODUITS.md`).
- **Poids** : valeurs indicatives, utilisées pour la livraison.
- **Stocks** : les pièces en précommande ne suivent pas de stock ; les autres ont un stock fictif.
- **Entretien** : non renseigné (la rubrique est masquée tant qu'elle est vide).
