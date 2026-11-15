import "server-only";
import type { SessionUser } from "./session.full";

export * from "./session.full";

/** Vitrine statique : personne n'est connecté. */
export const getCurrentUser = async (): Promise<SessionUser | null> => null;
