import { MarkerCoords } from './marker.interface';

export interface INode {
  id: number;
  tx: number;
  ty: number;
  coords: MarkerCoords;
  connected: Set<INode>;
  marker?: L.Marker;
}
