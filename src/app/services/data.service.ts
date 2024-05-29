import { Injectable } from '@angular/core';
import { IEgg } from '../components/eggs/egg.interface';
import { IMarker, IMarkerGroup, MarkerCoords } from '../components/map/marker.interface';
import eggJson from '@src/assets/eggs.json';
import markerJson from '@src/assets/markers.json';
import nodeJson from '@src/assets/nodes.json';
import { MapHelper } from '../helpers/map-helper';
import { INode } from '../components/map/node.interface';

type MarkerConfig = { groups: Array<IMarkerGroup> };

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
  private _markers: MarkerConfig = markerJson as unknown as MarkerConfig;
  private _nodes: Array<INodeJson> = nodeJson.items as Array<INodeJson>;

  getEggs(): Array<IEgg> {
    return this._eggs.map(egg => ({...egg}));
  }

  getMarkerGroups(): Array<IMarkerGroup> {
    const groups: Array<IMarkerGroup> = [];
    const ids = new Set();
    let i = 0;
    this._markers.groups.forEach(group => {
      groups.push({
        ...group,
        markers: group.markers.map((m: any) => {
          let marker: IMarker;
          // Convert array to IMarker.
          if (Array.isArray(m)) {
            marker = { id: m[0] as string, coords: m[1] as MarkerCoords };
          } else {
            marker = {...m};
          }

          // Check for duplicate IDs.
          if (marker.id && ids.has(marker.id)) {
            alert(`Duplicate marker id: ${marker.id}`);
          } else { ids.add(marker.id); }

          return marker;
        })
      });
    });

    return groups;
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
    // Add eggs to markers. Might merge these files at some point...
    const eggGroup: IMarkerGroup = {
      name: 'egg',
      section: 'Late game',
      label: 'Eggs',
      labelIcon: 'egg',
      markerIcon: 'egg',
      markerFilter: 'hue-rotate(205deg)',
      markers: this._eggs.map(egg => ({
        id: egg.code,
        name: egg.name,
        coords: egg.coords!,
        found: egg.obtained
      } as IMarker))
    };

    this._markers.groups = [eggGroup, ...this._markers.groups];

    (window as any).markerConfig = this._markers;
    (window as any).nodes = this.getNodes();
  }
}
