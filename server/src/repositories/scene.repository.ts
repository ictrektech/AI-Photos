import { Injectable } from '@nestjs/common';
import { type Kysely, sql } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { DummyValue, GenerateSql } from 'src/decorators';
import { AssetVisibility } from 'src/enum';
import { DB } from 'src/schema';
import { anyUuid } from 'src/utils/database';

interface BestAssetRow {
  assetId: string;
  sceneLabel: string;
  confidence: number;
}

export interface SceneExploreItem {
  sceneLabel: string;
  assetId: string;
  assetCount: number;
}

export interface SceneExploreOptions {
  maxScenes: number;
  minAssetsPerField: number;
}

@Injectable()
export class SceneRepository {
  constructor(@InjectKysely() private db: Kysely<DB>) {}

  async replaceLabels(assetId: string, labels: { sceneLabel: string; confidence: number }[]) {
    await this.db.transaction().execute(async (trx) => {
      await trx.deleteFrom('scene_search').where('assetId', '=', assetId).execute();
      if (labels.length > 0) {
        await trx
          .insertInto('scene_search')
          .values(labels.map((l) => ({ assetId, ...l })))
          .execute();
      }
    });
  }

  async deleteAll() {
    await this.db.deleteFrom('scene_search').execute();
  }

  async resetScenesDetectedAt() {
    await this.db
      .updateTable('asset_job_status')
      .set({ scenesDetectedAt: null })
      .execute();
  }

  async deleteByAssetIds(assetIds: string[]) {
    await this.db.deleteFrom('scene_search').where('assetId', 'in', assetIds).execute();
  }

  @GenerateSql({ params: [[DummyValue.UUID], { maxScenes: 12, minAssetsPerField: 5 }] })
  async getSceneExploreData(userIds: string[], options: SceneExploreOptions): Promise<SceneExploreItem[]> {
    const { maxScenes, minAssetsPerField } = options;

    const items = await this.db
      .selectFrom('scene_search')
      .innerJoin('asset', 'asset.id', 'scene_search.assetId')
      .select(['scene_search.sceneLabel', sql<number>`COUNT(DISTINCT "scene_search"."assetId")`.as('assetCount')])
      .where('asset.ownerId', '=', anyUuid(userIds))
      .where('asset.deletedAt', 'is', null)
      .where('asset.visibility', '!=', AssetVisibility.Hidden)
      .groupBy('scene_search.sceneLabel')
      .having(sql<number>`COUNT(DISTINCT "scene_search"."assetId")`, '>=', minAssetsPerField)
      .orderBy(sql<number>`COUNT(DISTINCT "scene_search"."assetId")`, 'desc')
      .limit(maxScenes)
      .execute();

    if (items.length === 0) {
      return [];
    }

    type LabelCountRow = { sceneLabel: string; assetCount: number };

    // For each qualifying label, pick the asset with highest confidence
    const labelNames: string[] = items.map((i: LabelCountRow) => i.sceneLabel);
    const bestAssets: BestAssetRow[] = await this.db
      .selectFrom('scene_search')
      .innerJoin('asset', 'asset.id', 'scene_search.assetId')
      .select(['scene_search.assetId', 'scene_search.sceneLabel', 'scene_search.confidence'])
      .where('scene_search.sceneLabel', 'in', labelNames)
      .where('asset.ownerId', '=', anyUuid(userIds))
      .where('asset.deletedAt', 'is', null)
      .where('asset.visibility', '!=', AssetVisibility.Hidden)
      .orderBy('scene_search.confidence', 'desc')
      .execute();

    // Deduplicate: keep only the first (highest confidence) per label
    const seen = new Set<string>();
    const bestByLabel = new Map<string, string>();
    for (const row of bestAssets) {
      if (!seen.has(row.sceneLabel)) {
        seen.add(row.sceneLabel);
        bestByLabel.set(row.sceneLabel, row.assetId);
      }
    }

    return items
      .map((item: LabelCountRow) => ({
        sceneLabel: item.sceneLabel,
        assetId: bestByLabel.get(item.sceneLabel) || '',
        assetCount: Number(item.assetCount),
      }))
      .filter((item: SceneExploreItem) => !!item.assetId);
  }
}
