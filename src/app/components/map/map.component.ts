import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild, isDevMode } from '@angular/core';
import L, { DomEvent, LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import { SubscriptionLike } from 'rxjs';
import GestureHandling from 'leaflet-gesture-handling';
import { DataService } from '@src/app/services/data.service';
import { EventService } from '@src/app/services/event.service';
import { MapService } from '@src/app/services/map.service';
import { IEgg } from '../eggs/egg.interface';

const mapWidth = 640;
const mapHeight = 352;

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

  eggIcon = L.icon({
    iconUrl: '/assets/icons/marker-egg.svg',
    iconSize: [24, 33],
    iconAnchor: [12, 33],
  });
  eggFoundIcon = L.icon({
    iconUrl: '/assets/icons/marker-egg-found.svg',
    iconSize: [24, 33],
    iconAnchor: [12, 33],
  });

  map!: L.Map;
  eggs: Array<IEgg> = [];

  private readonly _subscriptions: Array<SubscriptionLike> = [];

  constructor(
    private readonly _dataService: DataService,
    private readonly _eventService: EventService,
    private readonly _mapService: MapService,
    private readonly _changeDetectorRef: ChangeDetectorRef
  ) {
    this.eggs = _dataService.eggs;
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
      gestureHandling: true,
      center: [coords.y, coords.x],
      renderer: new L.SVG({ padding: 1000 })
    } as unknown as L.MapOptions);

    // Add map image
    const bounds = [[0, 0], [mapHeight, mapWidth]] as LatLngBoundsExpression;
    L.imageOverlay('/assets/game/map.png', bounds).addTo(this.map);

    // Draw rectangle around map
    L.rectangle(bounds, { color: '#f00', fillOpacity: 0, stroke: true, weight: 1 }).addTo(this.map);

    if (isDevMode()) {
      this.map.on('click', (event: L.LeafletMouseEvent) => {
        console.log('Clicked at:', event.latlng);
        navigator.clipboard.writeText(`[${(Math.floor(event.latlng.lng) + 0.5).toFixed(1)}, ${(Math.floor(event.latlng.lat) + 0.5).toFixed(1)}]`);
      });
    }

    // Draw eggs
    this.eggs.forEach(egg => {
      if (!egg.coords?.[0]) { return; }
      const icon = egg.obtained ? this.eggFoundIcon : this.eggIcon;
      const marker = L.marker([egg.coords[1], egg.coords[0]], {
        icon
      }).addTo(this.map);

      const popup = L.popup({
        content: _marker => { return this.createEggPopup(egg); },
        offset: [0, -28]
      });
      marker.bindPopup(popup);
    });

    this.map.on('moveend', () => { this.saveParamsToQuery(); });
  }

  private createEggPopup(egg: IEgg): HTMLElement {
    const div = document.createElement('div');
    const label = document.createElement('label');
    label.innerText = `${egg.name} (${egg.code})`;
    div.appendChild(label);
    return div;
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
