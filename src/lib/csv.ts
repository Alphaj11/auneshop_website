/** Cellule CSV échappée ; neutralise l'injection de formules dans les tableurs. */
export function csvCell(v: unknown) {
  const s = String(v ?? "");
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Fichier CSV (séparateur « ; » et BOM UTF-8 pour Excel en français). */
export function csvResponse(filename: string, header: string[], rows: unknown[][]) {
  const body = "﻿" + [header.join(";"), ...rows.map((r) => r.map(csvCell).join(";"))].join("\r\n");
  return new Response(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" },
  });
}
