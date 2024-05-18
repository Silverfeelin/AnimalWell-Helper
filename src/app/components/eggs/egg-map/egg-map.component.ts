import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, ViewChild, isDevMode } from '@angular/core';
import L, { DomEvent, LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import { SubscriptionLike } from 'rxjs';
import GestureHandling from 'leaflet-gesture-handling';
import { EventService } from '@src/app/services/event.service';
import { MapService } from '@src/app/services/map.service';
import { IEgg } from '../egg.interface';
import { MapHelper } from '@src/app/helpers/map-helper';
import { Router } from '@angular/router';

interface ITile {
  x: number;
  y: number;
  layer: L.LayerGroup;
  rectangle: L.Rectangle;
  revealed?: boolean;
}

L.Map.addInitHook('addHandler', 'gestureHandling', GestureHandling);

@Component({
  selector: 'app-egg-map',
  standalone: true,
  imports: [],
  templateUrl: './egg-map.component.html',
  styleUrl: './egg-map.component.scss'
})
export class EggMapComponent implements AfterViewInit, OnDestroy {
  @Input() eggs: Array<IEgg> = [];

  @ViewChild('map', { static: true }) mapElement!: ElementRef<HTMLDivElement>;

  map!: L.Map;
  tiles: Array<Array<ITile>> = [];
  eggMarkers: { [key: string]: { tile: ITile, marker: L.Marker } } = {};

  private readonly _subscriptions: Array<SubscriptionLike> = [];

  constructor(
    private readonly _eventService: EventService,
    private readonly _mapService: MapService,
    private readonly _router: Router,
    private readonly _changeDetectorRef: ChangeDetectorRef
  ) {
    MapHelper.createMarkerIcon('egg', { bgFilter: 'hue-rotate(205deg)' });
  }

  ngAfterViewInit(): void {
    this.renderMap();
    this.subscribeEvents();
  }

  subscribeEvents(): void {
    this._subscriptions.push(this._eventService.onEggsUpdated.subscribe({
      next: data => {
        data?.forEach(egg => this.onEggUpdated(egg));
        this.saveStorage();
      }
    }));

    this._mapService.onGotoQuadrant.subscribe(({ x, y }) => {
      if (!this.map) { return; }
      const center = [ MapHelper.mapHeight / 2, MapHelper.mapWidth / 2];
      const mx = x < center[1] ? 0 : 1;
      const my = y < center[0] ? 0 : 1;

      const dest: LatLngExpression = [center[0] / 2 + my * center[0], center[1] / 2 + mx * center[1]];
      this.map.flyTo(dest, 2);
      this.mapElement.nativeElement.scrollIntoView({ behavior: 'smooth' });
    });

    this._mapService.onGotoTile.subscribe(({ x, y }) => {
      const tileX = Math.floor(x / MapHelper.mapTileWidth);
      const tileY = Math.floor(y / MapHelper.mapTileHeight);
      const tile = this.tiles[tileY][tileX];

      if (!tile.revealed) {
        if (!confirm('You have not discovered the tile yet. Do you want to reveal it?')) { return; }
        this.toggleTile(tile, true);
        this.saveStorage();
      }

      this.map.flyTo([y, x], 3);
      this.mapElement.nativeElement.scrollIntoView({ behavior: 'smooth' });
    });
  }

  onEggUpdated(egg: IEgg): void {
    const m = this.eggMarkers[egg.code];
    if (!m) { return; }

    // Show or remove egg.
    egg.visible ? m.marker.addTo(this.map) : m.marker.removeFrom(this.map);
    const icon = MapHelper.getMarkerIcon(egg.obtained ? 'egg-found' : 'egg');
    m.marker.setIcon(icon);
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
    this._eventService.onEggsUpdated.next(updatedEggs);
  }
  showAllEggs(): void {
    if (!confirm('Are you sure you want to show all eggs?')) { return; }
    for (const egg of this.eggs) {
      egg.visible = true;
    }
    this._eventService.onEggsUpdated.next(this.eggs);
  }

  hideAllEggs(): void {
    if (!confirm(`Are you sure you want to hide all eggs?`)) { return; }
    for (const egg of this.eggs) {
      egg.visible = false;
    }
    this._eventService.onEggsUpdated.next(this.eggs);
  }

  hideAll(): void {
    if (!confirm('Are you sure you want to hide all map tiles?')) { return; }
    this.toggleAll(false);
    this.toggleTileByCoords(5, 4, true);
    this.saveStorage();
  }

  toggleAll(reveal: boolean): void {
    for (let y = 0; y < MapHelper.tilesY; y++) {
      for (let x = 0; x < MapHelper.tilesX; x++) {
        this.toggleTileByCoords(x, y, reveal);
      }
    }
  }

  navigateToMap(): void {
    if (!confirm('Are you sure you want to navigate to the map page? This will show the entire map with many markers, not just eggs!')) { return; }
    this._router.navigate(['/map']);
  }

  private renderMap(): void {
    // Create map
    const xyz = this.loadParamsFromQuery();
    const { x, y } = xyz || { x: 5.5 * MapHelper.mapTileWidth, y: 4.5 * MapHelper.mapTileHeight };
    const zoom = xyz?.z	?? 3;

    this.map = L.map(this.mapElement.nativeElement, {
      attributionControl: false,
      crs: L.CRS.Simple,
      minZoom: 0,
      maxZoom: 4,
      zoom,
      zoomControl: true,
      gestureHandling: true,
      center: [y,x],
      renderer: new L.SVG({ padding: 1000 })
    } as unknown as L.MapOptions);

    // Add map image
    const bounds = [[0, 0], [MapHelper.mapHeight, MapHelper.mapWidth]] as LatLngBoundsExpression;
    L.imageOverlay('/assets/game/map.png', bounds).addTo(this.map);

    // Draw rectangle around map
    L.rectangle(bounds, { color: '#f00', fillOpacity: 0, stroke: true, weight: 1 }).addTo(this.map);

    // Draw map tile rectangles.
    for (let y = 0; y < MapHelper.tilesY; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < MapHelper.tilesX; x++) {
        const layer = L.layerGroup().addTo(this.map);
        const rectangle = L.rectangle([[y * MapHelper.mapTileHeight, x * MapHelper.mapTileWidth], [(y+1) * MapHelper.mapTileHeight, (x+1) * MapHelper.mapTileWidth]], {
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
            navigator.clipboard.writeText(`[${(Math.floor(event.latlng.lat) + 0.5).toFixed(1)}, ${(Math.floor(event.latlng.lng) + 0.5).toFixed(1)}]`);
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

    // Draw eggs
    const eggIcon = MapHelper.getMarkerIcon('egg');
    const eggFoundIcon = MapHelper.getMarkerIcon('egg-found');
    this.eggs.forEach(egg => {
      if (!egg.coords?.[0]) { return; }
      const tileX = Math.floor(egg.coords[1] / MapHelper.mapTileWidth);
      const tileY = Math.floor(egg.coords[0] / MapHelper.mapTileHeight);
      const tile = this.tiles[tileY][tileX];

      const icon = egg.obtained ? eggFoundIcon : eggIcon;
      const marker = L.marker(egg.coords, {
        icon
      });

      const popup = L.popup({
        content: _marker => { return this.createEggPopup(egg); },
        offset: [0, -39]
      });
      marker.bindPopup(popup);

      this.eggMarkers[egg.code] = {
        marker,
        tile
      };

      if (egg.visible) {
        marker.addTo(this.map);
      }

      marker.addEventListener('dblclick', (event: L.LeafletMouseEvent) => {
        DomEvent.stopPropagation(event);
        this._eventService.onEggDblClick.next(egg);
      });
    });

    this.map.on('moveend', () => {
      this.saveParamsToQuery();
    });

    this.toggleTileByCoords(5, 4, true);
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
    const data = JSON.parse(localStorage.getItem('egg-map') || '{}');
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
    localStorage.setItem('egg-map', JSON.stringify(data));
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

  private encodeTiles(): string {
    const revealed: boolean[] = this.tiles.flat().map(t => !!t.revealed);
    let encodedValue = 0;

    for (let i = 0; i < revealed.length; i++) {
      if (revealed[i]) {
        encodedValue |= (1 << i);
      }
    }

    return encodedValue.toString(36);
  }

  private decodeTiles(encodedValue: string): boolean[] {
    const value = parseInt(encodedValue, 36);
    const revealed: boolean[] = [];
    const maxTiles = MapHelper.tilesX * MapHelper.tilesY;
    for (let i = 0; i < maxTiles; i++) {
      revealed.push((value & (1 << i)) !== 0);
    }
    return revealed;
  }
}
