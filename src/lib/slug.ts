/** Transforme un libellé en identifiant d'URL : « Robe Ama — été » → « robe-ama-ete ». */
export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
