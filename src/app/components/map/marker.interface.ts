export type MarkerCoords = [number, number];
export interface IMarker {
  id: string,
  name: string,
  description?: string,
  hints?: Array<string>,
  icon?: string,
  filter?: string;
  coords: MarkerCoords | Array<MarkerCoords>,
  found?: boolean,
}

export interface IDestinationMarker extends IMarker {
  destination: MarkerCoords | Array<MarkerCoords>
}

export interface ISequenceMarker extends IMarker {
  sequence: Array<MarkerCoords>;
}
