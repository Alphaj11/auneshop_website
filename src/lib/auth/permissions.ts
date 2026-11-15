/**
 * Matrice des permissions par rôle. Toujours vérifiée côté serveur
 * (voir requirePermission dans ./guards.ts).
 */
export type Role = "customer" | "order_manager" | "store_manager" | "super_admin";

export const permissions = [
  "admin.access",
  "dashboard.view",
  "orders.view",
  "orders.manage",
  "orders.refund",
  "orders.export",
  "products.manage",
  "collections.manage",
  "inventory.manage",
  "content.manage",
  "customers.view",
  "customers.manage",
  "settings.manage",
  "team.manage",
  "audit.view",
  "qamar.create",
  "qamar.manage",
] as const;

export type Permission = (typeof permissions)[number];

const matrix: Record<Role, readonly Permission[]> = {
  customer: [],
  order_manager: ["admin.access", "dashboard.view", "orders.view", "orders.manage", "orders.export", "customers.view", "qamar.create"],
  store_manager: [
    "admin.access",
    "dashboard.view",
    "orders.view",
    "orders.manage",
    "orders.refund",
    "orders.export",
    "products.manage",
    "collections.manage",
    "inventory.manage",
    "content.manage",
    "customers.view",
    "qamar.create",
  ],
  super_admin: permissions,
};

export function can(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return matrix[role].includes(permission);
}

export function isStaff(role: Role | undefined | null) {
  return can(role, "admin.access");
}

export const roleLabels: Record<Role, string> = {
  customer: "Client",
  order_manager: "Gestionnaire de commandes",
  store_manager: "Gestionnaire de boutique",
  super_admin: "Super administrateur",
};
