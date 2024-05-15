export type MarkerCoords = [number, number];
export interface IMarker {
  id: string,
  name: string,
  coords: MarkerCoords | Array<MarkerCoords>,
  found?: boolean,
}
