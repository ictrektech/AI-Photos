import { authenticate } from '$lib/utils/auth';
import { getFormatter } from '$lib/utils/i18n';
import { getAllPeople, getExploreData, getSceneData } from '@immich/sdk';
import type { PageLoad } from './$types';

export const load = (async ({ url }) => {
  await authenticate(url);
  const [items, response, scenes] = await Promise.all([
    getExploreData(),
    getAllPeople({ withHidden: false }),
    getSceneData(),
  ]);
  const $t = await getFormatter();

  return {
    items,
    response,
    scenes,
    meta: {
      title: $t('explore'),
    },
  };
}) satisfies PageLoad;
