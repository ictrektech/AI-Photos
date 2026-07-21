import { authenticate } from '$lib/utils/auth';
import { getFormatter } from '$lib/utils/i18n';
import { getSceneData } from '@immich/sdk';
import type { PageLoad } from './$types';

export const load = (async ({ url }) => {
  await authenticate(url);
  const scenes = await getSceneData();
  const $t = await getFormatter();

  return {
    scenes,
    meta: {
      title: $t('scenes'),
    },
  };
}) satisfies PageLoad;
