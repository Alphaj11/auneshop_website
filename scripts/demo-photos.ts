/**
 * Photos d'illustration pour la démonstration (présentation à la marque).
 *
 * Toutes viennent d'Unsplash, sous licence Unsplash (usage commercial gratuit,
 * sans autorisation requise ; https://unsplash.com/license). Elles montrent des
 * vêtements proches de l'esprit Aune mais NE SONT PAS des pièces Aune : elles
 * sont à remplacer par les photos de la marque. Crédits : docs/CREDITS-PHOTOS.md.
 *
 *   npm run demo:photos   → télécharge les fichiers dans public/demo/photos/
 */

export type DemoPhoto = { file: string; photo: string; page: string; author: string; subject: string };

const u = (file: string, photo: string, page: string, author: string, subject: string): DemoPhoto => ({
  file,
  photo,
  page,
  author,
  subject,
});

/** Une photo par produit (clé = slug du produit). */
export const productPhotos: Record<string, DemoPhoto> = {
  "robe-lea": u("robe-lea.jpg", "1583346292527-522309cc9be3", "oHXKQJ82hjI", "Rome Wilkerson", "robe blanche cache-cœur sans manches"),
  "haut-lou-ann": u("haut-lou-ann.jpg", "1600884350802-c6d0bf14dcc6", "C_yY_TVyH7g", "Marek Mucha", "blouse blanche fluide à col en V"),
  "robe-camille": u("robe-camille.jpg", "1614339804578-8e82dd7f3174", "k2btiivnV3Q", "Adalia Botha", "robe rose au dos ouvert"),
  "haut-malo": u("haut-malo.jpg", "1774005906344-57048d3f5856", "QpvMdWqFe1s", "Margo Evardson", "haut blanc sans manches et pantalon en lin"),
  "veste-nico": u("veste-nico.jpg", "1748620755078-e33d3e817ae1", "L6SIEU6Gh8I", "Zaven Baghdasaryan", "veste claire portée ouverte"),
  "yash-estival": u("yash-estival.jpg", "1605154733982-8e32960646e7", "uQUdqbJnj3k", "LaCreme.com", "top à rayures jaune et blanc"),
  chloe: u("chloe.jpg", "1713812964743-f5bc0e117154", "33dQHgOgUpM", "Look Studio", "ensemble blanc sous une arche"),
  jessica: u("jessica.jpg", "1786641747448-c4feb39aa940", "rALZ9Hjwwrs", "Zulfugar Karimov", "blouse rose et jupe claire"),
  jeannine: u("jeannine.jpg", "1586861957932-14c79b88f464", "2brEDUShIaU", "Roland Hechanova", "top jaune à encolure américaine"),
  "odette-noir": u("odette-noir.jpg", "1789110519554-bdca2e4549e5", "pRP3RLTYfoA", "engin akyurt", "pantalon noir à jambes larges"),
  romain: u("romain.jpg", "1724335141947-a63578d5d118", "hnKGJ4dXsYE", "Filip Rankovic Grobgaard", "veste de travail blanche"),
  alain: u("alain.jpg", "1772583435283-b07bc9950497", "1xM12BS0B_Y", "Samantha Castillo", "chemise en lin blanc"),
  paul: u("paul.jpg", "1779497056323-9797e5fb2e00", "udzBYw_smfY", "Alef Morais", "t-shirt rose dans la lumière dorée"),
  bastien: u("bastien.jpg", "1627686011747-74adda3d2343", "D_Y-BuWJvjw", "Ricardo Morales", "chemise à col mao en lin"),
  sam: u("sam.jpg", "1605949405965-d49ada3f9189", "cEnSr1WRHUY", "behrouz sasani", "haut jaune devant un mur clair"),
};

/** Visuel principal de l'accueil et couvertures de collections. */
export const pagePhotos: Record<string, DemoPhoto> = {
  hero: u("hero.jpg", "1574655563118-3e3eab32015d", "2-P-dXuUYYM", "Alejandro Morelos", "robe blanche devant un mur de pierre"),
  phir: u("collection-phir.jpg", "1574655563118-3e3eab32015d", "2-P-dXuUYYM", "Alejandro Morelos", "robe blanche devant un mur de pierre"),
  surya: u("collection-surya.jpg", "1605154733982-8e32960646e7", "uQUdqbJnj3k", "LaCreme.com", "top à rayures jaune et blanc"),
  aadmi: u("collection-aadmi.jpg", "1724335141947-a63578d5d118", "hnKGJ4dXsYE", "Filip Rankovic Grobgaard", "veste de travail blanche"),
};

export const photoUrl = (p: DemoPhoto) => `/demo/photos/${p.file}`;
