export type MarkerType =
  'egg' | 'key' | 'door' | 'item' | 'bunny' | 'telephone' | 'teleporter' | 'match' | 'candle' | 'flame' | 'pipe' |
  'medal' | 'totem' | 'cheatSecret' | 'explosive' | 'berry' | 'blueberry' | 'firecracker' | 'chinchilla' |
  'bubbleBird' | 'yellowFlower' | 'pinkFlower' | 'tulip' | 'brownMushroom' | 'swirlyPlant';
export type MarkerCoords = [number, number];

export interface IMarker {
  id: string,
  name?: string,
  description?: string,
  hints?: Array<string>,
  icon?: string,
  filter?: string;
  coords: MarkerCoords | Array<MarkerCoords>,
  found?: boolean
}

export interface IDestinationMarker extends IMarker {
  destination: MarkerCoords | Array<MarkerCoords>
}

export interface ISequenceMarker extends IMarker {
  sequence: Array<MarkerCoords>;
}
