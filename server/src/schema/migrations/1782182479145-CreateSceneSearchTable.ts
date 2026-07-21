import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`CREATE TABLE "scene_search" ("assetId" uuid NOT NULL, "sceneLabel" character varying(64) NOT NULL, "confidence" real NOT NULL)`.execute(
    db,
  );
  await sql`ALTER TABLE "scene_search" ADD CONSTRAINT "scene_search_pkey" PRIMARY KEY ("assetId", "sceneLabel")`.execute(
    db,
  );
  await sql`ALTER TABLE "scene_search" ADD CONSTRAINT "scene_search_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "asset" ("id") ON UPDATE CASCADE ON DELETE CASCADE`.execute(
    db,
  );
  await sql`CREATE INDEX "scene_search_sceneLabel_idx" ON "scene_search" ("sceneLabel")`.execute(db);
  await sql`CREATE INDEX "scene_search_assetId_idx" ON "scene_search" ("assetId")`.execute(db);
  await sql`ALTER TABLE "asset_job_status" ADD COLUMN "scenesDetectedAt" timestamp with time zone`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE "asset_job_status" DROP COLUMN "scenesDetectedAt"`.execute(db);
  await sql`DROP INDEX "scene_search_assetId_idx"`.execute(db);
  await sql`DROP INDEX "scene_search_sceneLabel_idx"`.execute(db);
  await sql`ALTER TABLE "scene_search" DROP CONSTRAINT "scene_search_assetId_fkey"`.execute(db);
  await sql`ALTER TABLE "scene_search" DROP CONSTRAINT "scene_search_pkey"`.execute(db);
  await sql`DROP TABLE "scene_search"`.execute(db);
}
