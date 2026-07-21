import type { Translations } from 'svelte-i18n';

export const sceneLabelKeys: Record<string, Translations> = {
  animal: 'scene_animal',
  architecture: 'scene_architecture',
  beach: 'scene_beach',
  bird: 'scene_bird',
  bridge: 'scene_bridge',
  cat: 'scene_cat',
  child: 'scene_child',
  desert: 'scene_desert',
  document_screenshot: 'scene_document_screenshot',
  dog: 'scene_dog',
  fireworks: 'scene_fireworks',
  flower: 'scene_flower',
  food: 'scene_food',
  fruit: 'scene_fruit',
  grassland: 'scene_grassland',
  group_photo: 'scene_group_photo',
  macro: 'scene_macro',
  mountain: 'scene_mountain',
  plant: 'scene_plant',
  river: 'scene_river',
  selfie: 'scene_selfie',
  snow: 'scene_snow',
  sports: 'scene_sports',
  street: 'scene_street',
  sunrise_sunset: 'scene_sunrise_sunset',
  travel: 'scene_travel',
  underwater: 'scene_underwater',
  vehicle: 'scene_vehicle',
  waterfall: 'scene_waterfall',
};

export const getSceneLabel = (label: string, translate: (key: Translations) => string) => {
  const translationKey = sceneLabelKeys[label];
  return translationKey ? translate(translationKey) : label;
};
