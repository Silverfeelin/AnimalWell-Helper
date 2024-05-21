import L from 'leaflet';
import { IMarker } from '../components/map/marker.interface';
import { isDevMode } from '@angular/core';

export interface IMapMarkerIconOptions {
  bgFilter?: string;
}
export interface IMapMarkerPopupOptions {
  defaultText?: string;
}

export class MapHelper {
  static mapWidth = 640;
  static mapHeight = 352;
  static mapTileWidth = 40;
  static mapTileHeight = 22;
  static tileWidth = 320;
  static tileHeight = 180;
  static tilesX = 16;
  static tilesY = 16;

  static icons: { [key: string]: L.DivIcon } = {};

  static createMarkerIcon(name: string, options: IMapMarkerIconOptions): void {
    if (MapHelper.icons[name]) { return; }
    const bgFilter = options.bgFilter ? `filter: ${options.bgFilter};` : '';
    const html = `
<img src="/assets/icons/marker.png" class="marker" style="${bgFilter}">
<img class="marker-icon" src="/assets/game/icons/${name}.png" class="pixelated">`;
MapHelper.icons[name] = L.divIcon({ html, className: 'map-marker', iconSize: [38, 44], iconAnchor: [19, 44] });

const htmlFound = `
<img src="/assets/icons/marker-found.png" class="marker">
<img class="marker-icon" src="/assets/game/icons/${name}.png" class="pixelated">`;
    MapHelper.icons[`${name}-found`] = L.divIcon({ html: htmlFound, className: 'map-marker found', iconSize: [38, 44], iconAnchor: [19, 44] });
  }

  static getMarkerIcon(name: string): L.DivIcon {
    if (!MapHelper.icons[name]) { throw new Error(`Icon ${name} not found`); }
    return MapHelper.icons[name];
  }

  static createMarkerPopup(marker: IMarker, options: IMapMarkerPopupOptions): HTMLElement {
    const container = document.createElement('div');
    container.innerText = marker.name ?? options.defaultText ?? 'Unknown';
    if (isDevMode()) {
      const id = document.createElement('div');
      id.innerText = `[${marker.id}]`;
      id.addEventListener('click', () => { navigator.clipboard.writeText(marker.id); });
      container.appendChild(id);
    }
    return container;
  }
}
