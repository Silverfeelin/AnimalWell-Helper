import { Injectable } from '@angular/core';
import { IEgg } from '../components/eggs/egg.interface';
import { IMarker } from '../components/map/marker.interface';
import eggJson from '@src/assets/eggs.json';
import markerJson from '@src/assets/markers.json';

type MarkerConfig = {
  eggs: Array<IMarker>,
  bunnies: Array<IMarker>,
  telephones: Array<IMarker>,
  teleporters: Array<IMarker>,
  matches: Array<IMarker>,
  candles: Array<IMarker>,
  sMedals: Array<IMarker>,
  kMedals: Array<IMarker>,
  eMedals: Array<IMarker>,
};

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private _eggs: Array<IEgg> = eggJson.items as Array<IEgg>;
  private _markers: MarkerConfig = markerJson as MarkerConfig;

  getEggs(): Array<IEgg> {
    return this._eggs.map(egg => ({...egg}));
  }

  getMarkers(): MarkerConfig {
    const obj: MarkerConfig = {} as MarkerConfig;
    for (const key in this._markers) {
      (obj as any)[key] = (this._markers as any)[key].map((marker: IMarker) => ({...marker}));
    }
    return obj;
  }

  constructor() {
    // Add eggs to markers. Will probably merge these files later.
    this._markers.eggs = this._eggs.map(egg => {
      return {
        id: egg.code,
        name: egg.name,
        coords: egg.coords!,
        found: egg.obtained
      };
    });
  }
}
