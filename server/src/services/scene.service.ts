import { Injectable } from '@nestjs/common';
import { mapAsset } from 'src/dtos/asset-response.dto';
import { AuthDto } from 'src/dtos/auth.dto';
import { SearchExploreResponseDto } from 'src/dtos/search.dto';
import { JobName } from 'src/enum';
import { DEFAULT_SCENE_LABELS } from 'src/scene-labels';
import { BaseService } from 'src/services/base.service';
import { isSceneClassificationEnabled } from 'src/utils/misc';

const sceneLabelOrder = new Map(DEFAULT_SCENE_LABELS.map((label, index) => [label.name, index]));

@Injectable()
export class SceneService extends BaseService {
  async getSceneData(auth: AuthDto): Promise<SearchExploreResponseDto[]> {
    const { machineLearning } = await this.getConfig({ withCache: true });
    if (!isSceneClassificationEnabled(machineLearning)) {
      return [];
    }
    const options = {
      maxScenes: DEFAULT_SCENE_LABELS.length,
      minAssetsPerField: machineLearning.sceneClassification.minAssetsPerField,
    };
    const sceneData = await this.sceneRepository.getSceneExploreData([auth.user.id], options);

    if (sceneData.length === 0) {
      return [];
    }

    const sortedSceneData = sceneData.toSorted((a, b) => {
      const labelOrder =
        (sceneLabelOrder.get(a.sceneLabel) ?? Number.MAX_SAFE_INTEGER) -
        (sceneLabelOrder.get(b.sceneLabel) ?? Number.MAX_SAFE_INTEGER);

      return labelOrder || b.assetCount - a.assetCount;
    });

    const assets = await this.assetRepository.getByIdsWithAllRelationsButStacks(sortedSceneData.map((s) => s.assetId));

    const assetMap = new Map(assets.map((a) => [a.id, a]));
    const items = sortedSceneData
      .map((scene) => {
        const asset = assetMap.get(scene.assetId);
        if (!asset) {
          return null;
        }
        return {
          value: scene.sceneLabel,
          data: mapAsset(asset, { auth }),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return [{ fieldName: 'scene', items }];
  }

  async triggerReclassification(auth: AuthDto): Promise<void> {
    this.logger.log(`Triggering scene reclassification by user ${auth.user.id}`);
    try {
      await this.jobRepository.queue({ name: JobName.SceneClassificationQueueAll, data: { force: true } });
      this.logger.log('Scene reclassification job queued successfully');
    } catch (error: any) {
      this.logger.error(`Failed to queue scene reclassification: ${error.message}`);
      throw error;
    }
  }
}
