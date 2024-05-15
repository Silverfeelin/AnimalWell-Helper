import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild, isDevMode } from '@angular/core';
import L, { DomEvent, LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import { SubscriptionLike } from 'rxjs';
import GestureHandling from 'leaflet-gesture-handling';
import { DataService } from '@src/app/services/data.service';
import { EventService } from '@src/app/services/event.service';
import { MapService } from '@src/app/services/map.service';
import { IEgg } from '../eggs/egg.interface';
import { IMarker, MarkerCoords } from './marker.interface';

const mapWidth = 640;
const mapHeight = 352;

L.Map.addInitHook('addHandler', 'gestureHandling', GestureHandling);

const icons: { [key: string]: L.Icon } = {};

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
  markers = this._dataService.markers;

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
    const coords = this.loadParamsFromQuery() || { x: mapWidth / 2, y: mapHeight / 2, z: 1 };
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
    const bounds = [[0, 0], [mapHeight, mapWidth]] as LatLngBoundsExpression;
    L.imageOverlay('/assets/game/map.png', bounds).addTo(this.map);

    if (isDevMode()) {
      this.map.on('click', (event: L.LeafletMouseEvent) => {
        console.log('Clicked at:', event.latlng);
        navigator.clipboard.writeText(`[${(Math.floor(event.latlng.lng) + 0.5).toFixed(1)}, ${(Math.floor(event.latlng.lat) + 0.5).toFixed(1)}]`);
      });
    }

    // Draw markers
    this.drawMarkers(this.markers.eggs, 'egg');
    this.drawMarkers(this.markers.bunnies, 'bunny');
    this.drawMarkers(this.markers.telephones, 'telephone');
    this.drawMarkers(this.markers.matches, 'match');
    this.drawMarkers(this.markers.candles, 'candle');
    this.drawMarkers(this.markers.sMedals, 'medal-s');
    this.drawMarkers(this.markers.kMedals, 'medal-k');
    this.drawMarkers(this.markers.eMedals, 'medal-e');

    this.map.on('moveend', () => { this.saveParamsToQuery(); });
  }


  private drawMarkers(markers: Array<IMarker>, icon: string): void {
    this.createIcon(icon);
    markers.forEach(m => {
      if (!m.coords?.[0]) { return; }

      const coords = typeof m.coords[0] === 'number'
        ? [m.coords] as Array<MarkerCoords>
        : m.coords as Array<MarkerCoords>;

      const markers: Array<L.Marker> = [];
      coords.forEach(coord => {
        const marker = L.marker([coord[1], coord[0]], {
          icon: m.found ? icons[`${icon}-found`] : icons[icon]
        }).addTo(this.map);
        markers.push(marker);

        const popup = L.popup({
          content: _marker => { return m.name || m.id; },
          offset: [0, -39]
        });
        marker.bindPopup(popup);

        marker.on('dblclick', evt => {
          DomEvent.stop(evt);
          m.found = !m.found;

          markers.forEach(n => {
            n.setIcon(m.found ? icons[`${icon}-found`] : icons[icon]);
          });
          this.saveStorage();
        });
      });
    });
  }

  private createIcon(icon: string): void {
    icons[icon] ??= L.icon({ iconUrl: `/assets/icons/marker-${icon}.png`, iconSize: [32, 47], iconAnchor: [16, 47] });
    icons[`${icon}-found`] ??= L.icon({ iconUrl: `/assets/icons/marker-${icon}-found.png`, iconSize: [32, 47], iconAnchor: [16, 47] });
  }

  private createEggPopup(egg: IEgg): HTMLElement {
    const div = document.createElement('div');
    const label = document.createElement('label');
    label.innerText = `${egg.name} (${egg.code})`;
    div.appendChild(label);
    return div;
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
}
