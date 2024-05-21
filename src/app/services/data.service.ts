import { Injectable } from '@angular/core';
import { IEgg } from '../components/eggs/egg.interface';
import { IMarker, MarkerCoords, MarkerType } from '../components/map/marker.interface';
import eggJson from '@src/assets/eggs.json';
import markerJson from '@src/assets/markers.json';

type ProbablyMarkerConfig = {
  [key in keyof MarkerConfig]?: Array<IMarker> | [number, MarkerCoords];
}

type MarkerConfig = {
  [key in MarkerType]: Array<IMarker>;
}

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private _eggs: Array<IEgg> = eggJson.items as Array<IEgg>;
  private _markers: ProbablyMarkerConfig = markerJson as unknown as ProbablyMarkerConfig;

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
  }
}
