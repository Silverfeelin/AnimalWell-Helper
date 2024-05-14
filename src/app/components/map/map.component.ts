import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild, isDevMode } from '@angular/core';
import L, { DomEvent, LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import { DataService } from '../../services/data.service';
import { IEgg } from '../eggs/egg.interface';
import { EventService } from '../../services/event.service';
import { SubscriptionLike } from 'rxjs';
import { MapService } from '../../services/map.service';
import GestureHandling from 'leaflet-gesture-handling';

const mapWidth = 640;
const mapHeight = 352;
const tileWidth = 40;
const tileHeight = 22;
const tilesX = 16;
const tilesY = 16;

interface ITile {
  x: number;
  y: number;
  layer: L.LayerGroup;
  rectangle: L.Rectangle;
  revealed?: boolean;
}

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
  tiles: Array<Array<ITile>> = [];
  eggs: Array<IEgg> = [];
  eggMarkers: { [key: string]: { tile: ITile, marker: L.Marker } } = {};

  private readonly _subscriptions: Array<SubscriptionLike> = [];

  constructor(
    private readonly _dataService: DataService,
    private readonly _eventService: EventService,
    private readonly _mapService: MapService,
    private readonly _changeDetectorRef: ChangeDetectorRef
  ) {
  }

  ngAfterViewInit(): void {
    this._dataService.getEggs().subscribe(eggs => {
      this.eggs = eggs;
      this.onData();
    });
  }

  onData(): void {
    this.renderMap();
    this._subscriptions.push(this._eventService.eggsUpdated.subscribe({
      next: data => {
        data?.forEach(egg => this.onEggUpdated(egg));
        this.saveStorage();
      }
    }));

    this.subscribeEvents();
  }

  subscribeEvents(): void {
    this._mapService.onGotoQuadrant.subscribe(({ x, y }) => {
      if (!this.map) { return; }
      const center = [ mapHeight / 2, mapWidth / 2];
      const mx = x < center[1] ? 0 : 1;
      const my = y < center[0] ? 0 : 1;

      const dest: LatLngExpression = [center[0] / 2 + my * center[0], center[1] / 2 + mx * center[1]];
      console.log('Going to:', dest);
      this.map.flyTo(dest, 2);
      this.mapElement.nativeElement.scrollIntoView({ behavior: 'smooth' });
    });

    this._mapService.onGotoTile.subscribe(({ x, y }) => {
      const tileX = Math.floor(x / tileWidth);
      const tileY = Math.floor(y / tileHeight);
      const tile = this.tiles[tileY][tileX];
      this.toggleTile(tile, true);
      this.saveStorage();
      this.map.flyTo([y, x], 3);
      this.mapElement.nativeElement.scrollIntoView({ behavior: 'smooth' });
    });
  }

  onEggUpdated(egg: IEgg): void {
    const m = this.eggMarkers[egg.code];
    if (!m) { return; }

    // Show or remove egg.
    egg.visible ? m.marker.addTo(m.tile.layer) : m.tile.layer.removeLayer(m.marker);
    m.marker.setIcon(egg.obtained ? this.eggFoundIcon : this.eggIcon);
  }

  ngOnDestroy(): void {
    this._subscriptions.forEach(sub => sub.unsubscribe());
    this._subscriptions.length = 0;
  }

  showAll(): void {
    if (!confirm('Are you sure you want to show all map tiles?')) { return; }
    this.toggleAll(true);
    this.saveStorage();
  }

  showTileEggs(): void {
    if (!confirm('Are you sure you want to show all eggs in the currently visible tiles?')) { return; }
    const updatedEggs = [];
    for (const egg of this.eggs) {
      if (!egg.coords?.[0]) { continue; }
      const m = this.eggMarkers[egg.code];
      if (!m.tile.revealed) { continue; }
      egg.visible = true;
      updatedEggs.push(egg);
    }
    this._eventService.eggsUpdated.next(updatedEggs);
  }

  showAllEggs(): void {
    if (!confirm(`Are you sure you want to show all eggs? Any eggs in hidden tiles will show up once you reveal those tiles.`)) { return; }
    for (const egg of this.eggs) {
      egg.visible = true;
    }
    this._eventService.eggsUpdated.next(this.eggs);
  }

  hideAllEggs(): void {
    if (!confirm(`Are you sure you want to hide all eggs?`)) { return; }
    for (const egg of this.eggs) {
      egg.visible = false;
    }
    this._eventService.eggsUpdated.next(this.eggs);
  }

  hideAll(): void {
    if (!confirm('Are you sure you want to hide all map tiles?')) { return; }
    this.toggleAll(false);
    this.toggleTileByCoords(5, 4, true);
    this.saveStorage();
  }

  toggleAll(reveal: boolean): void {
    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        this.toggleTileByCoords(x, y, reveal);
      }
    }
  }

  private renderMap(): void {
    // Create map
    const center: LatLngExpression = [mapHeight / 2, mapWidth / 2];
    this.map = L.map(this.mapElement.nativeElement, {
      attributionControl: false,
      crs: L.CRS.Simple,
      minZoom: 0,
      maxZoom: 4,
      zoom: 1,
      zoomControl: true,
      gestureHandling: true,
      center,
      renderer: new L.SVG({ padding: 1000 })
    } as unknown as L.MapOptions);

    // Add map image
    const bounds = [[0, 0], [mapHeight, mapWidth]] as LatLngBoundsExpression;
    L.imageOverlay('/assets/game/map.png', bounds).addTo(this.map);
    this.map.fitBounds(bounds);

    // Draw rectangle around map
    L.rectangle(bounds, { color: '#f00', fillOpacity: 0, stroke: true }).addTo(this.map);

    // Draw map tile rectangles.
    for (let y = 0; y < tilesY; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < tilesX; x++) {
        const layer = L.layerGroup().addTo(this.map);
        const rectangle = L.rectangle([[y * tileHeight, x * tileWidth], [(y+1) * tileHeight, (x+1) * tileWidth]], {
          color: '#f00',
          fillColor: '#000', fillOpacity: 1,
          stroke: true, weight: 1
        }).addTo(this.map);

        const tile: ITile = { x, y, layer, rectangle, revealed: false };
        this.tiles[y][x] = tile;

        rectangle.on('click', (event: L.LeafletMouseEvent) => {
          DomEvent.stopPropagation(event);

          if (isDevMode()) {
            console.log('Clicked at:', event.latlng);
            navigator.clipboard.writeText(`[${(Math.floor(event.latlng.lng) + 0.5).toFixed(1)}, ${(Math.floor(event.latlng.lat) + 0.5).toFixed(1)}]`);
          }
        });

        rectangle.on('dblclick', (event: L.LeafletMouseEvent) => {
          DomEvent.stopPropagation(event);

          this.toggleTile(tile);
          this.saveStorage();
          this._changeDetectorRef.markForCheck();
        });
      }
    }

    // Draw map sections
    // const sections = L.layerGroup().addTo(this.map);
    // L.rectangle([[0, 0], center], { color: '#f00', fillOpacity: 0, stroke: true, weight: 1 }).addTo(sections);
    // L.rectangle([[0, center[1]], [center[0], mapWidth]], { color: '#f00', fillOpacity: 0, stroke: true, weight: 1 }).addTo(sections);
    // L.rectangle([[center[0], 0], [mapHeight, center[1]]], { color: '#f00', fillOpacity: 0, stroke: true, weight: 1 }).addTo(sections);
    // L.rectangle([center, [mapHeight, mapWidth]], { color: '#f00', fillOpacity: 0, stroke: true, weight: 1 }).addTo(sections);

    // Draw eggs
    this.eggs.forEach(egg => {
      if (!egg.coords?.[0]) { return; }
      const tileX = Math.floor(egg.coords[0] / tileWidth);
      const tileY = Math.floor(egg.coords[1] / tileHeight);
      const tile = this.tiles[tileY][tileX];

      const icon = egg.obtained ? this.eggFoundIcon : this.eggIcon;
      const marker = L.marker([egg.coords[1], egg.coords[0]], {
        icon
      });

      const popup = L.popup({
        content: _marker => { return this.createEggPopup(egg); },
        offset: [0, -28]
      });
      marker.bindPopup(popup);

      this.eggMarkers[egg.code] = {
        marker,
        tile
      };

      if (egg.visible) {
        marker.addTo(this.eggMarkers[egg.code].tile.layer);
      }

      marker.addEventListener('dblclick', (event: L.LeafletMouseEvent) => {
        DomEvent.stopPropagation(event);
        egg.obtained = !egg.obtained;
        this._eventService.eggsUpdated.next([egg]);
      });
    });

    this.loadStorage();
  }

  private toggleTileByCoords(x: number, y: number, reveal?: boolean): void {
    const tile = this.tiles[y][x];
    return this.toggleTile(tile, reveal);
  }

  private toggleTile(tile: ITile, reveal?: boolean): void {
    tile.revealed = reveal ?? !tile.revealed;
    tile.rectangle.setStyle({ fillOpacity: tile.revealed ? 0 : 1, color: tile.revealed ? '#0000' : '#f008'});
    tile.revealed ? tile.layer.addTo(this.map) : tile.layer.removeFrom(this.map);
  }

  private createEggPopup(egg: IEgg): HTMLElement {
    const div = document.createElement('div');
    const label = document.createElement('label');
    label.innerText = `${egg.name} (${egg.code})`;
    div.appendChild(label);
    return div;
  }

  private loadStorage(): void {
    const data = JSON.parse(localStorage.getItem('map') || '{}');
    const revealed = data.revealed || [] as Array<Array<boolean>>;

    for (let y = 0; y < revealed.length; y++) {
      for (let x = 0; x < revealed[y].length; x++) {
        this.toggleTileByCoords(x, y, !!revealed[y][x]);
      }
    }
    this.toggleTileByCoords(5, 4, true);
  }

  private saveStorage(): void {
    const data = {
      revealed: this.tiles.map(row => row.map(tile => tile.revealed ? 1 : 0))
    };
    localStorage.setItem('map', JSON.stringify(data));
  }
}
