import { Injectable } from '@nestjs/common';
import { SystemConfig } from 'src/config';
import { JOBS_ASSET_PAGINATION_SIZE } from 'src/constants';
import { OnEvent, OnJob } from 'src/decorators';
import { AssetVisibility, ImmichWorker, JobName, JobStatus, QueueName } from 'src/enum';
import { ArgOf } from 'src/repositories/event.repository';
import { DEFAULT_SCENE_LABELS } from 'src/scene-labels';
import { BaseService } from 'src/services/base.service';
import { JobItem, JobOf } from 'src/types';
import { getCLIPModelInfo, isSceneClassificationEnabled } from 'src/utils/misc';
import { computeCosineSimilarities } from 'src/utils/scene';

@Injectable()
export class SceneClassificationService extends BaseService {
  private labelEmbeddingsCache: Map<string, string> | null = null;

  @OnEvent({ name: 'ConfigInit', workers: [ImmichWorker.Microservices] })
  async onConfigInit({ newConfig }: ArgOf<'ConfigInit'>) {
    await this.precomputeLabelEmbeddings(newConfig);
  }

  @OnEvent({ name: 'ConfigUpdate', workers: [ImmichWorker.Microservices], server: true })
  async onConfigUpdate({ newConfig }: ArgOf<'ConfigUpdate'>) {
    await this.precomputeLabelEmbeddings(newConfig);
  }

  @OnEvent({ name: 'MachineLearningServerHealthy', workers: [ImmichWorker.Microservices] })
  async onMachineLearningServerHealthy() {
    const config = await this.getConfig({ withCache: true });
    await this.ensureLabelEmbeddings(config);
  }

  @OnEvent({ name: 'ConfigValidate' })
  onConfigValidate({ newConfig }: ArgOf<'ConfigValidate'>) {
    if (!isSceneClassificationEnabled(newConfig.machineLearning)) {
      return;
    }

    // Validate that the CLIP model exists (reuses smart search model)
    getCLIPModelInfo(newConfig.machineLearning.clip.modelName);
  }

  private async precomputeLabelEmbeddings(config: SystemConfig) {
    if (!isSceneClassificationEnabled(config.machineLearning)) {
      this.labelEmbeddingsCache = null;
      return;
    }

    const { modelName } = config.machineLearning.clip;
    const sceneLabels = DEFAULT_SCENE_LABELS.filter((l) => l.enabled);

    this.logger.log(`Precomputing ${sceneLabels.length} scene label embeddings...`);

    const cache = new Map<string, string>();
    for (const label of sceneLabels) {
      try {
        const embedding = await this.machineLearningRepository.encodeText(label.prompt, { modelName });
        cache.set(label.name, embedding);
      } catch (error: any) {
        this.logger.warn(`Failed to encode scene label "${label.name}": ${error.message}`);
      }
    }

    this.labelEmbeddingsCache = cache;
    this.logger.log(`Successfully precomputed ${cache.size} scene label embeddings`);
  }

  private async ensureLabelEmbeddings(config: SystemConfig) {
    if (this.labelEmbeddingsCache && this.labelEmbeddingsCache.size > 0) {
      return true;
    }

    this.logger.warn('No label embeddings cached, retrying scene label embedding precomputation');
    await this.precomputeLabelEmbeddings(config);

    return !!this.labelEmbeddingsCache && this.labelEmbeddingsCache.size > 0;
  }

  @OnJob({ name: JobName.SceneClassificationQueueAll, queue: QueueName.SceneClassification })
  async handleQueueAll({ force }: JobOf<JobName.SceneClassificationQueueAll>): Promise<JobStatus> {
    const config = await this.getConfig({ withCache: false });
    const { machineLearning } = config;
    if (!isSceneClassificationEnabled(machineLearning)) {
      return JobStatus.Skipped;
    }

    if (!(await this.ensureLabelEmbeddings(config))) {
      this.logger.warn('No label embeddings cached, cannot queue scene classification');
      return JobStatus.Failed;
    }

    if (force) {
      await this.sceneRepository.deleteAll();
      await this.sceneRepository.resetScenesDetectedAt();
    }

    let jobs: JobItem[] = [];
    let count = 0;
    const assets = this.assetJobRepository.streamForSceneClassification(force);
    this.logger.log(`Streaming assets for scene classification (force=${force})...`);

    for await (const asset of assets) {
      count++;
      this.logger.verbose(`Streamed asset ${count}: ${asset.id}`);
      jobs.push({ name: JobName.SceneClassification, data: { id: asset.id } });

      if (jobs.length >= JOBS_ASSET_PAGINATION_SIZE) {
        await this.jobRepository.queueAll(jobs);
        jobs = [];
      }
    }

    if (jobs.length > 0) {
      await this.jobRepository.queueAll(jobs);
    }
    if (count === 0) {
      this.logger.warn('No assets found for scene classification');
    } else {
      this.logger.log(`Queued ${count} assets for scene classification`);
    }
    return JobStatus.Success;
  }

  @OnJob({ name: JobName.SceneClassification, queue: QueueName.SceneClassification })
  async handleClassify({ id }: JobOf<JobName.SceneClassification>): Promise<JobStatus> {
    const config = await this.getConfig({ withCache: true });
    const { machineLearning } = config;
    if (!isSceneClassificationEnabled(machineLearning)) {
      return JobStatus.Skipped;
    }

    if (!(await this.ensureLabelEmbeddings(config))) {
      this.logger.warn('No label embeddings cached, cannot classify');
      return JobStatus.Failed;
    }
    const labelEmbeddings = this.labelEmbeddingsCache;
    if (!labelEmbeddings) {
      return JobStatus.Failed;
    }

    const asset = await this.assetJobRepository.getForClipEncoding(id);
    if (!asset) {
      return JobStatus.Failed;
    }

    if (asset.visibility === AssetVisibility.Hidden) {
      return JobStatus.Skipped;
    }

    const embedding = await this.searchRepository.getEmbedding(id);
    if (!embedding?.embedding) {
      this.logger.verbose(`Asset ${id} has no CLIP embedding, skipping`);
      return JobStatus.Skipped;
    }

    const results = computeCosineSimilarities(embedding.embedding, labelEmbeddings);

    if (results.length > 0) {
      let best = results[0];
      for (const result of results) {
        if (result.similarity > best.similarity) {
          best = result;
        }
      }
      this.logger.verbose(`Asset ${id}: best label "${best.sceneLabel}" = ${best.similarity.toFixed(4)}`);
    }

    const { minScore, topLabels } = machineLearning.sceneClassification;
    const topResults = results
      .filter((r) => r.similarity >= minScore)
      .toSorted((a, b) => b.similarity - a.similarity)
      .slice(0, topLabels);

    if (topResults.length === 0) {
      this.logger.verbose(`Asset ${id}: no labels above threshold (minScore=${minScore})`);
      // Clear old labels even when no new results pass threshold
      await this.sceneRepository.replaceLabels(id, []);
      await this.assetRepository.upsertJobStatus({ assetId: id, scenesDetectedAt: new Date() });
      return JobStatus.Success;
    }

    this.logger.verbose(
      `Asset ${id}: top labels = ${topResults.map((r) => `${r.sceneLabel}(${r.similarity.toFixed(4)})`).join(', ')}`,
    );
    await this.sceneRepository.replaceLabels(
      id,
      topResults.map((r) => ({ sceneLabel: r.sceneLabel, confidence: r.similarity })),
    );

    await this.assetRepository.upsertJobStatus({ assetId: id, scenesDetectedAt: new Date() });

    return JobStatus.Success;
  }
}
