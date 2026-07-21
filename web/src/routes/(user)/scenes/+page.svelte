<script lang="ts">
  import ImageThumbnail from '$lib/components/assets/thumbnail/image-thumbnail.svelte';
  import UserPageLayout from '$lib/components/layouts/user-page-layout.svelte';
  import { Route } from '$lib/route';
  import { getAssetMediaUrl } from '$lib/utils';
  import { getSceneLabel } from '$lib/utils/scene-label';
  import { AssetMediaSize, type SearchExploreResponseDto } from '@immich/sdk';
  import { t } from 'svelte-i18n';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const getFieldItems = (items: SearchExploreResponseDto[], field: string) => {
    const targetField = items.find((item) => item.fieldName === field);
    return targetField?.items || [];
  };

  let scenes = $derived(getFieldItems(data.scenes, 'scene'));
</script>

<UserPageLayout title={$t('scenes')} description={scenes.length > 0 ? `(${scenes.length})` : undefined}>
  {#if scenes.length > 0}
    <div class="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-10 gap-1 mt-4">
      {#each scenes as item (item.value)}
        <div
          class="p-2 rounded-xl hover:bg-gray-200 border-2 hover:border-immich-primary/50 hover:shadow-sm dark:hover:bg-immich-dark-primary/20 hover:dark:border-immich-dark-primary/25 border-transparent transition-all"
        >
          <a class="block text-center" href={Route.search({ sceneLabel: item.value })} draggable="false">
            <ImageThumbnail
              circle
              shadow
              url={getAssetMediaUrl({ id: item.data.id, size: AssetMediaSize.Thumbnail })}
              altText={getSceneLabel(item.value, $t)}
              title={getSceneLabel(item.value, $t)}
              widthStyle="100%"
            />
            <p
              class="bg-white dark:bg-immich-dark-gray border-gray-100 text-center dark:border-gray-900 w-full rounded-2xl mt-2 py-2 px-2 text-sm text-primary truncate"
            >
              {getSceneLabel(item.value, $t)}
            </p>
          </a>
        </div>
      {/each}
    </div>
  {:else}
    <p class="text-center text-sm dark:text-immich-dark-fg mt-10">{$t('no_explore_results_message')}</p>
  {/if}
</UserPageLayout>
