export interface SceneLabel {
  name: string;
  displayName: string;
  prompt: string;
  enabled: boolean;
}

export const DEFAULT_SCENE_LABELS: SceneLabel[] = [
  { name: 'selfie', displayName: 'Selfie', prompt: 'selfie', enabled: true },
  { name: 'group_photo', displayName: 'Group Photo', prompt: 'group photo', enabled: true },
  { name: 'child', displayName: 'Children', prompt: 'child', enabled: true },
  { name: 'sports', displayName: 'Sports', prompt: 'sport', enabled: true },
  { name: 'animal', displayName: 'Animals', prompt: 'animal', enabled: true },
  { name: 'cat', displayName: 'Cats', prompt: 'cat', enabled: true },
  { name: 'dog', displayName: 'Dogs', prompt: 'dog', enabled: true },
  { name: 'bird', displayName: 'Birds', prompt: 'bird', enabled: true },
  { name: 'plant', displayName: 'Plants', prompt: 'plant', enabled: true },
  { name: 'flower', displayName: 'Flowers', prompt: 'flower', enabled: true },
  { name: 'fruit', displayName: 'Fruit', prompt: 'fruit', enabled: true },
  { name: 'macro', displayName: 'Macro', prompt: 'macro', enabled: true },
  { name: 'waterfall', displayName: 'Waterfall', prompt: 'waterfall', enabled: true },
  { name: 'mountain', displayName: 'Mountain', prompt: 'mountain', enabled: true },
  { name: 'snow', displayName: 'Snow', prompt: 'snow', enabled: true },
  { name: 'grassland', displayName: 'Grassland', prompt: 'grassland', enabled: true },
  { name: 'desert', displayName: 'Desert', prompt: 'desert', enabled: true },
  { name: 'underwater', displayName: 'Underwater', prompt: 'underwater', enabled: true },
  { name: 'beach', displayName: 'Beach', prompt: 'beach', enabled: true },
  { name: 'river', displayName: 'Rivers', prompt: 'river', enabled: true },
  { name: 'fireworks', displayName: 'Fireworks', prompt: 'fireworks', enabled: true },
  { name: 'sunrise_sunset', displayName: 'Sunrise & Sunset', prompt: 'sunset', enabled: true },
  { name: 'architecture', displayName: 'Architecture', prompt: 'architecture', enabled: true },
  { name: 'street', displayName: 'Streets', prompt: 'street', enabled: true },
  { name: 'bridge', displayName: 'Bridge', prompt: 'bridge', enabled: true },
  { name: 'travel', displayName: 'Travel', prompt: 'travel', enabled: true },
  { name: 'vehicle', displayName: 'Vehicles', prompt: 'vehicle', enabled: true },
  { name: 'food', displayName: 'Food', prompt: 'food', enabled: true },
  { name: 'document_screenshot', displayName: 'Document Screenshots', prompt: 'document', enabled: true },
];
