import { defaults } from 'src/config';
import { AssetVisibility, ImmichWorker, JobStatus } from 'src/enum';
import { DEFAULT_SCENE_LABELS } from 'src/scene-labels';
import { SceneClassificationService } from 'src/services/scene-classification.service';
import { AssetFactory } from 'test/factories/asset.factory';
import { systemConfigStub } from 'test/fixtures/system-config.stub';
import { newTestService, ServiceMocks } from 'test/utils';

describe(SceneClassificationService.name, () => {
  let sut: SceneClassificationService;
  let mocks: ServiceMocks;

  beforeEach(() => {
    ({ sut, mocks } = newTestService(SceneClassificationService));

    mocks.config.getWorker.mockReturnValue(ImmichWorker.Microservices);
    mocks.assetJob.getForClipEncoding.mockResolvedValue({
      id: 'asset-1',
      visibility: AssetVisibility.Timeline,
      files: [],
    });
    mocks.search.getEmbedding.mockResolvedValue({ assetId: 'asset-1', embedding: '[1,0]' });
    mocks.machineLearning.encodeText.mockResolvedValue('[1,0]');
  });

  it('should work', () => {
    expect(sut).toBeDefined();
  });

  describe('handleClassify', () => {
    it('should do nothing if machine learning is disabled', async () => {
      mocks.systemMetadata.get.mockResolvedValue(systemConfigStub.machineLearningDisabled);

      expect(await sut.handleClassify({ id: 'asset-1' })).toBe(JobStatus.Skipped);

      expect(mocks.machineLearning.encodeText).not.toHaveBeenCalled();
      expect(mocks.scene.replaceLabels).not.toHaveBeenCalled();
    });

    it('should retry label embedding precomputation when the startup cache is empty', async () => {
      const asset = AssetFactory.create();
      const enabledLabels = DEFAULT_SCENE_LABELS.filter((label) => label.enabled);
      mocks.assetJob.getForClipEncoding.mockResolvedValue({ id: asset.id, visibility: asset.visibility, files: [] });
      mocks.search.getEmbedding.mockResolvedValue({ assetId: asset.id, embedding: '[1,0]' });
      mocks.machineLearning.encodeText.mockRejectedValue(new Error('Machine learning unavailable'));

      await sut.onConfigInit({ newConfig: defaults });

      expect(mocks.machineLearning.encodeText).toHaveBeenCalledTimes(enabledLabels.length);

      mocks.machineLearning.encodeText.mockClear();
      mocks.machineLearning.encodeText.mockResolvedValue('[1,0]');

      expect(await sut.handleClassify({ id: asset.id })).toBe(JobStatus.Success);

      expect(mocks.machineLearning.encodeText).toHaveBeenCalledTimes(enabledLabels.length);
      expect(mocks.assetJob.getForClipEncoding).toHaveBeenCalledWith(asset.id);
      expect(mocks.scene.replaceLabels).toHaveBeenCalledWith(
        asset.id,
        expect.arrayContaining([
          expect.objectContaining({ sceneLabel: enabledLabels[0].name }),
          expect.objectContaining({ sceneLabel: enabledLabels[1].name }),
        ]),
      );
      expect(mocks.asset.upsertJobStatus).toHaveBeenCalledWith({
        assetId: asset.id,
        scenesDetectedAt: expect.any(Date),
      });
    });

    it('should precompute label embeddings when the machine learning server becomes healthy', async () => {
      const asset = AssetFactory.create();
      const enabledLabels = DEFAULT_SCENE_LABELS.filter((label) => label.enabled);
      mocks.systemMetadata.get.mockResolvedValue(defaults);
      mocks.assetJob.getForClipEncoding.mockResolvedValue({ id: asset.id, visibility: asset.visibility, files: [] });
      mocks.search.getEmbedding.mockResolvedValue({ assetId: asset.id, embedding: '[1,0]' });
      mocks.machineLearning.encodeText.mockRejectedValue(new Error('Machine learning unavailable'));

      await sut.onConfigInit({ newConfig: defaults });

      expect(mocks.machineLearning.encodeText).toHaveBeenCalledTimes(enabledLabels.length);

      mocks.machineLearning.encodeText.mockClear();
      mocks.machineLearning.encodeText.mockResolvedValue('[1,0]');

      await sut.onMachineLearningServerHealthy();

      expect(mocks.machineLearning.encodeText).toHaveBeenCalledTimes(enabledLabels.length);

      mocks.machineLearning.encodeText.mockClear();

      expect(await sut.handleClassify({ id: asset.id })).toBe(JobStatus.Success);
      expect(mocks.machineLearning.encodeText).not.toHaveBeenCalled();
      expect(mocks.scene.replaceLabels).toHaveBeenCalledWith(
        asset.id,
        expect.arrayContaining([expect.objectContaining({ sceneLabel: enabledLabels[0].name })]),
      );
    });
  });
});
