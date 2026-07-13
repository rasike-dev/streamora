-- Rename Keycloak identity bridge to provider-neutral externalId
ALTER TABLE "User" RENAME COLUMN "keycloakSub" TO "externalId";

ALTER INDEX "User_keycloakSub_key" RENAME TO "User_externalId_key";
ALTER INDEX "User_keycloakSub_idx" RENAME TO "User_externalId_idx";
