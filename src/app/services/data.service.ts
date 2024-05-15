import { Injectable } from '@angular/core';
import { IEgg } from '../components/eggs/egg.interface';
import { IMarker } from '../components/map/marker.interface';
import eggJson from '@src/assets/eggs.json';
import markerJson from '@src/assets/markers.json';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  eggs: Array<IEgg> = eggJson.items as Array<IEgg>;
  markers = markerJson as {
    eggs: Array<IMarker>,
    bunnies: Array<IMarker>,
    telephones: Array<IMarker>,
    matches: Array<IMarker>,
    candles: Array<IMarker>,
    sMedals: Array<IMarker>,
    kMedals: Array<IMarker>,
    eMedals: Array<IMarker>
  };

  /**
   *
   */
  constructor() {
    this.markers.eggs = this.eggs.map(egg => {
      return {
        id: egg.code,
        name: egg.name,
        coords: egg.coords!,
        found: egg.obtained
      };
    });
  }
}
