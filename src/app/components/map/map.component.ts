import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild, isDevMode } from '@angular/core';
import L, { DomEvent, LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import { SubscriptionLike } from 'rxjs';
import GestureHandling from 'leaflet-gesture-handling';
import { DataService } from '@src/app/services/data.service';
import { EventService } from '@src/app/services/event.service';
import { MapService } from '@src/app/services/map.service';
import { IEgg } from '../eggs/egg.interface';
import { IMarker, MarkerCoords } from './marker.interface';
import { MapHelper } from '@src/app/helpers/map-helper';

L.Map.addInitHook('addHandler', 'gestureHandling', GestureHandling);

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss'
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('map', { static: true }) mapElement!: ElementRef<HTMLDivElement>;

  map!: L.Map;
  markers = this._dataService.getMarkers();

  private readonly _subscriptions: Array<SubscriptionLike> = [];

  constructor(
    private readonly _dataService: DataService,
    private readonly _eventService: EventService,
    private readonly _mapService: MapService,
    private readonly _changeDetectorRef: ChangeDetectorRef
  ) {
    this.loadStorage();
  }

  ngAfterViewInit(): void {
    this.renderMap();
    this.subscribeEvents();
  }

  subscribeEvents(): void {

  }

  ngOnDestroy(): void {
    this._subscriptions.forEach(sub => sub.unsubscribe());
    this._subscriptions.length = 0;
  }

  private renderMap(): void {
    // Create map
    const coords = this.loadParamsFromQuery() || { x: MapHelper.mapWidth / 2, y: MapHelper.mapHeight / 2, z: 1 };
    this.map = L.map(this.mapElement.nativeElement, {
      attributionControl: false,
      crs: L.CRS.Simple,
      minZoom: 0,
      maxZoom: 4,
      zoom: coords.z,
      zoomControl: true,
      gestureHandling: false,
      center: [coords.y, coords.x],
      renderer: new L.SVG({ padding: 1000 })
    } as unknown as L.MapOptions);

    // Add map image
    const bounds = [[0, 0], [MapHelper.mapHeight, MapHelper.mapWidth]] as LatLngBoundsExpression;
    L.imageOverlay('/assets/game/map.png', bounds).addTo(this.map);

    if (isDevMode()) {
      this.map.on('click', (event: L.LeafletMouseEvent) => {
        console.log('Clicked at:', event.latlng);
        navigator.clipboard.writeText(`[${(Math.floor(event.latlng.lat) + 0.5).toFixed(1)}, ${(Math.floor(event.latlng.lng) + 0.5).toFixed(1)}]`);
      });
    }

    // Draw markers
    this.drawMarkers(this.markers.eggs, 'egg', 205);
    this.drawMarkers(this.markers.bunnies, 'bunny', 310);
    this.drawMarkers(this.markers.telephones, 'telephone', 295);
    this.drawMarkers(this.markers.teleporters, 'teleporter', 270);
    this.drawMarkers(this.markers.matches, 'match', 45);
    this.drawMarkers(this.markers.candles, 'candle', 0);
    this.drawMarkers(this.markers.sMedals, 'medal-s', 160);
    this.drawMarkers(this.markers.kMedals, 'medal-k', 160);
    this.drawMarkers(this.markers.eMedals, 'medal-e', 160);

    this.map.on('moveend', () => { this.saveParamsToQuery(); });
  }


  private drawMarkers(markers: Array<IMarker>, icon: string, hue: number): void {
    // Create icon for marker group.
    MapHelper.createMarkerIcon(icon, { hue });

    const popupCoords = new Map<L.Popup, Array<MarkerCoords>>();
    // Draw lines to other coordinates of marker.
    let lineLayer = L.layerGroup().addTo(this.map);
    this.map.on('popupopen', (evt: L.PopupEvent) => {
      lineLayer.clearLayers();
      const coords = popupCoords.get(evt.popup);
      const pos = evt.popup.getLatLng()!;
      coords?.forEach(coord => {
        // Draw line from pos to coord.
        L.polyline([pos, coord], { color: '#fff', weight: 3, dashArray: '20, 10' }).addTo(lineLayer);
      });
    });
    this.map.on('popupclose', (evt: L.PopupEvent) => {
      lineLayer.clearLayers();
    });

    // Draw markers
    markers.forEach(m => {
      if (!m.coords?.[0]) { return; }

      const coords = typeof m.coords[0] === 'number'
        ? [m.coords] as Array<MarkerCoords>
        : m.coords as Array<MarkerCoords>;

      const markers: Array<L.Marker> = [];
      coords.forEach(coord => {
        const marker = L.marker(coord, {
          icon: m.found ? MapHelper.getMarkerIcon(`${icon}-found`) : MapHelper.getMarkerIcon(icon),
        }).addTo(this.map);
        markers.push(marker);

        const popup = L.popup({
          content: _marker => { return m.name || m.id; },
          offset: [0, -37]
        });
        marker.bindPopup(popup);
        popupCoords.set(popup, coords.filter(c => c !== coord));

        marker.on('dblclick', evt => {
          DomEvent.stop(evt);
          m.found = !m.found;

          const mIcon = m.found ? MapHelper.getMarkerIcon(`${icon}-found`) : MapHelper.getMarkerIcon(icon);
          markers.forEach(n => {
            n.setIcon(mIcon);
          });
          this.saveStorage();
        });
      });
    });
  }

  private loadStorage(): void {
    const found = new Set(JSON.parse(localStorage.getItem('map.found')  || '[]'));
    for (const group of Object.values(this.markers)) {
      for (const marker of group) {
        marker.found = found.has(marker.id);
      }
    }
  }

  private saveStorage(): void {
    const markers = Object.values(this.markers).flat();
    const found = markers.filter(m => m.found).map(m => m.id);
    localStorage.setItem('map.found', JSON.stringify(found));
  }

  private loadParamsFromQuery(): { x: number, y: number, z: number } | undefined {
    const url = new URL(location.href);
    const x = parseFloat(url.searchParams.get('x') || '0');
    const y = parseFloat(url.searchParams.get('y') || '0');
    const z = parseFloat(url.searchParams.get('z') || '0');
    return x || y ? { x, y, z } : undefined;
  }

  private saveParamsToQuery(): void {
    if (!this.map) { return; }
    const center = this.map.getCenter();
    const zoom = this.map.getZoom();
    const url = new URL(location.href);
    url.searchParams.set('x', center.lng.toFixed(1));
    url.searchParams.set('y', center.lat.toFixed(1));
    url.searchParams.set('z', zoom.toFixed(0));
    history.replaceState(history.state, '', `${url}`);
  }


  private calculatePosition(start: any, end: any, distance: any): L.LatLngExpression {
    // Calculate the distance between the start and end coordinates
    const totalDistance = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));

    // Calculate the ratio of the distance to the total distance
    const ratio = distance / totalDistance;

    // Calculate the coordinates of the point at the given distance from the start
    const x = start[0] + ratio * (end[0] - start[0]);
    const y = start[1] + ratio * (end[1] - start[1]);

    return [x, y];
  }

  private calculateAngle(pointA: any, pointB: any): number {
    // Calculate the difference in coordinates
    const dx = pointB[0] - pointA[0];
    const dy = pointB[1] - pointA[1];

    // Calculate the angle using arctan
    const angleRadians = Math.atan2(dy, dx);

    return angleRadians;
  }
}
