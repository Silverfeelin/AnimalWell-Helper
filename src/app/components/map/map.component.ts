import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import L, { DomEvent, LatLngBoundsExpression } from 'leaflet';

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

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss'
})
export class MapComponent implements AfterViewInit {
  @ViewChild('map', { static: true }) mapElement!: ElementRef<HTMLDivElement>;

  map!: L.Map;
  tiles: Array<Array<ITile>> = [];

  constructor(
    private readonly _changeDetectorRef: ChangeDetectorRef
  ) {
  }

  ngAfterViewInit(): void {
    this.renderMap();
  }

  showAll(): void {
    if (!confirm('Are you sure you want to show all map tiles?')) { return; }
    this.toggleAll(true);
    this.saveStorage();
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
    this.map = L.map(this.mapElement.nativeElement, {
      attributionControl: false,
      crs: L.CRS.Simple,
      minZoom: 0,
      maxZoom: 4,
      zoom: 1,
      zoomControl: true,
      renderer: new L.SVG({ padding: 1000 })
    });

    // Add map image
    const bounds = [[0, 0], [mapHeight, mapWidth]] as LatLngBoundsExpression;
    L.imageOverlay('/assets/game/map.png', bounds).addTo(this.map);
    this.map.fitBounds(bounds);

    // Debug
    this.map.on('click', (event: L.LeafletMouseEvent) => {
      console.log('Clicked at:', event.latlng);
    });

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
          this.toggleTile(tile);
          this.saveStorage();
          this._changeDetectorRef.markForCheck();
        });

        rectangle.on('dblclick', (event: L.LeafletMouseEvent) => {
          DomEvent.stopPropagation(event);
        });
      }
    }

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

  private loadStorage(): void {
    const data = JSON.parse(localStorage.getItem('map') || '{}');
    const revealed = data.revealed || [] as Array<Array<boolean>>;
    for (let y = 0; y < revealed.length; y++) {
      for (let x = 0; x < revealed[y].length; x++) {
        this.toggleTileByCoords(x, y, !!revealed[y][x]);
      }
    }
  }

  private saveStorage(): void {
    const data = {
      revealed: this.tiles.map(row => row.map(tile => tile.revealed ? 1 : 0))
    };
    localStorage.setItem('map', JSON.stringify(data));
  }
}
