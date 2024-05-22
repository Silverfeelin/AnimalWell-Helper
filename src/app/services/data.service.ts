import { Injectable } from '@angular/core';
import { IEgg } from '../components/eggs/egg.interface';
import { IMarker, MarkerCoords, MarkerType } from '../components/map/marker.interface';
import eggJson from '@src/assets/eggs.json';
import markerJson from '@src/assets/markers.json';
import nodeJson from '@src/assets/nodes.json';
import { MapHelper } from '../helpers/map-helper';
import { INode } from '../components/map/node.interface';

type ProbablyMarkerConfig = {
  [key in keyof MarkerConfig]?: Array<IMarker> | [number, MarkerCoords];
}

type MarkerConfig = {
  [key in MarkerType]: Array<IMarker>;
}

export interface INodeJson {
  id: number;
  coords: MarkerCoords;
  connected: Array<number>;
}

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private _eggs: Array<IEgg> = eggJson.items as Array<IEgg>;
  private _markers: ProbablyMarkerConfig = markerJson as unknown as ProbablyMarkerConfig;
  private _nodes: Array<INodeJson> = nodeJson.items as Array<INodeJson>;

  getEggs(): Array<IEgg> {
    return this._eggs.map(egg => ({...egg}));
  }

  getMarkers(): MarkerConfig {
    const obj: MarkerConfig = {} as MarkerConfig;
    const ids = new Set();
    let i = 0;
    for (const key in this._markers) {
      (obj as any)[key] = (this._markers as any)[key].map((marker: IMarker) => {
        // Convert array to IMarker.
        if (Array.isArray(marker)) {
          marker = { id: marker[0], coords: marker[1] };
        }
        if (marker.id && ids.has(marker.id)) {
          alert(`Duplicate marker id: ${marker.id}`);
        }
        ids.add(marker.id);
        return {...marker};
      });
    }
    return obj;
  }

  getNodes(): Array<INode> {
    const nodeMap = new Map<number, INode>()
    this._nodes.forEach(node => { nodeMap.set(node.id, {
      id: node.id,
      tx: Math.floor(node.coords[1] / MapHelper.mapTileWidth),
      ty: Math.floor(node.coords[0] / MapHelper.mapTileHeight),
      coords: node.coords,
      connected: new Set()
    }); });

    const nodes = this._nodes.map(node => {
      const n = nodeMap.get(node.id)!;
      node.connected.forEach(id => {
        if (!nodeMap.has(id)) { return; }
        n.connected.add(nodeMap.get(id)!);
      });
      return n;
    });

    return nodes;
  }

  constructor() {
    // Add eggs to markers. Will probably merge these files later.
    this._markers.egg = this._eggs.map(egg => {
      return {
        id: egg.code,
        name: egg.name,
        coords: egg.coords!,
        found: egg.obtained
      };
    });

    (window as any).nodes = this.getNodes();
  }
}
