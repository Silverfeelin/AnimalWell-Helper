import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild, isDevMode } from '@angular/core';
import L, { DomEvent, LatLngBoundsExpression } from 'leaflet';
import { SubscriptionLike } from 'rxjs';
import GestureHandling from 'leaflet-gesture-handling';
import { DataService } from '@src/app/services/data.service';
import { EventService } from '@src/app/services/event.service';
import { IDestinationMarker, IMarker, ISequenceMarker, MarkerCoords, MarkerType } from './marker.interface';
import { MapHelper } from '@src/app/helpers/map-helper';
import { MapNodeEditorComponent } from './map-node-editor/map-node-editor.component';
import { MapMarkerEditorComponent } from './map-marker-editor/map-marker-editor.component';
import { MapEventService } from '@src/app/services/map-event.service';
import { db } from '@src/app/services/db';

L.Map.addInitHook('addHandler', 'gestureHandling', GestureHandling);

type MapLayerName = 'map' | 'world' | 'explored' | 'bright' | 'border' | 'coords';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [
    MapMarkerEditorComponent, MapNodeEditorComponent
  ],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss'
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapDiv', { static: true }) mapElement!: ElementRef<HTMLDivElement>;

  map!: L.Map;
  markers = this._dataService.getMarkers();
  customMarkers: Array<{ id: number, name: string, layer: L.LayerGroup, count: number, visible: boolean }> = [];

  editing = false;
  editingGroup?: string;

  mapLayers: { [key in MapLayerName]: { layer: L.LayerGroup, type: 'map' | 'world' | 'border', visible: boolean } } = {
    map: { layer: null as any, type: 'map', visible: false },
    world: { layer: null as any, type: 'world', visible: false },
    explored: { layer: null as any, type: 'world', visible: false },
    bright: { layer: null as any, type: 'world', visible: false },
    border: { layer: null as any, type: 'border', visible: false },
    coords: { layer: null as any, type: 'border', visible: false }
  };

  markerLayers: { [key in MarkerType]: L.LayerGroup } = {} as any;
  markerLayersVisible: { [key in MarkerType]: boolean } = {} as any;
  markerLayersCount: { [key in MarkerType]: number } = {} as any;

  isSidebarFolded = false;

  private readonly _subscriptions: Array<SubscriptionLike> = [];

  constructor(
    private readonly _dataService: DataService,
    private readonly _eventService: EventService,
    private readonly _mapEventService: MapEventService,
    private readonly _changeDetectorRef: ChangeDetectorRef
  ) {
    this.fixMarkerIcons();
    this.loadStorage();
  }

  private fixMarkerIcons(): void {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:  '/assets/icons/marker-icon-2x.png',
      iconUrl: '/assets/icons/marker-icon.png',
      shadowUrl:  '/assets/icons/marker-shadow.png'
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.renderMap();
      this.subscribeEvents();
      this.loadCustomMarkers();
    });
  }

  subscribeEvents(): void {
  }

  ngOnDestroy(): void {
    this._subscriptions.forEach(sub => sub.unsubscribe());
    this._subscriptions.length = 0;
  }

  toggleEdit(group?: string): void {
    this.editing = !this.editing;
    this.editingGroup = this.editing ? group : undefined;
  }

  showMapLayer(name: MapLayerName, show?: boolean): void {
    const currentLayer = this.mapLayers[name];
    if (!currentLayer) { return; }

    currentLayer.visible = show ?? !currentLayer.visible;
    currentLayer.visible ? currentLayer.layer.addTo(this.map) : currentLayer.layer.removeFrom(this.map);
    if (currentLayer.type === 'world' && currentLayer.visible) {
      Object.values(this.mapLayers).filter(l => l.type === 'world' && l !== currentLayer).forEach(l => {
        l.visible = false;
        l.layer.removeFrom(this.map);
      });
    }

    // Overlay map on world.
    if (currentLayer.visible && currentLayer.type === 'world') {
      this.mapLayers.map.layer.getLayers().forEach(layer => layer instanceof L.ImageOverlay && layer.setOpacity(0.5) && layer.bringToFront());
    } else if (!currentLayer.visible && !Object.values(this.mapLayers).find(l => l.type === 'world' && l.visible)) {
      this.mapLayers.map.layer.getLayers().forEach(layer => layer instanceof L.ImageOverlay && layer.setOpacity(1));
    }

    this.saveStorage();
  }

  toggleMarkerLayers(...names: Array<MarkerType>): void {
    const makeVisible = !names.every(name => this.markerLayersVisible[name]);
    names.forEach(name => {
      this.markerLayersVisible[name] = makeVisible;
      const layer = this.markerLayers[name];
      makeVisible ? layer.addTo(this.map) : layer.removeFrom(this.map);
    });
    this.saveStorage();
  }

  toggleCustomMarkerGroup(name: string): void {
    const group = this.customMarkers.find(m => m.name === name);
    if (!group) { return; }
    group.visible = !group.visible;
    group.visible ? group.layer.addTo(this.map) : group.layer.removeFrom(this.map);
  }

  deleteCustomMarkerGroup(name: string): void {
    if (!confirm(`Are you sure you want to delete the group "${name}"? This can not be undone.`)) { return; }
    const group = this.customMarkers.find(m => m.name === name);
    if (!group) { return; }
    group.layer.removeFrom(this.map);
    this.customMarkers = this.customMarkers.filter(m => m !== group);
    db.markerGroups.get(group.id).then(g => g && db.markerGroups.delete(g.id!));
  }

  onCustomMarkerGroupCreated(name: string): void {
    this.editing = false;
    this.editingGroup = undefined;
    this.loadCustomMarkers();
  }

  onCustomMarkerGroupUpdated(name: string): void {
    this.editing = false;
    this.editingGroup = undefined;
    this.loadCustomMarkers();
  }

  async importCustomMarkerGroup(): Promise<void> {
    const name = prompt('Enter a name for the marker group');
    if (!name) { return; }

    if (this.customMarkers.find(m => m.name === name)) {
      alert('A group with this name already exists.');
      return;
    }

    const json = prompt('Paste JSON here:');
    if (!json) { return; }

    let markers: Array<MarkerCoords> = [];
    try {
      markers = JSON.parse(json);
    } catch (e) {
      alert('Invalid JSON. Expected an array of coordinates.');
      return;
    }

    const groupId = await db.markerGroups.add({ name });
    for (const coords of markers) {
      await db.markers.add({ groupId, coords });
    }

    this.loadCustomMarkers();
  }

  exportCustomMarkerGroup(name: string): void {
    const group = this.customMarkers.find(m => m.name === name);
    if (!group) { return; }
    const markers = group.layer.getLayers().filter(l => l instanceof L.Marker).map(l => {
      const coords = (l as L.Marker).getLatLng();
      return [coords.lat, coords.lng];
    });
    const json = JSON.stringify(markers);
    prompt('Copy this JSON:', json);
  }

  preventDefault(event: Event): void {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  private renderMap(): void {
    // Create map
    const coords = this.loadParamsFromQuery() || { x: MapHelper.mapWidth / 2, y: MapHelper.mapHeight / 2, z: 1 };
    this.map = L.map(this.mapElement.nativeElement, {
      attributionControl: true,
      crs: L.CRS.Simple,
      minZoom: 0,
      maxZoom: 5,
      zoom: coords.z,
      zoomControl: false,
      gestureHandling: false,
      center: [coords.y, coords.x],
      renderer: new L.SVG({ padding: 1000 })
    } as unknown as L.MapOptions);

    // Remove 'Leaflet' from attribution.
    this.map.attributionControl.setPrefix('');

    // Expose map as global.
    (window as any).map = this.map;

    // Add zoom controls
    L.control.zoom({ position: 'topright' }).addTo(this.map);

    // Create pane for custom markers.
    this.map.createPane('customMarkerPane').style.zIndex = '650';

    // Add map image
    const bounds = [[0, 0], [MapHelper.mapHeight, MapHelper.mapWidth]] as LatLngBoundsExpression;
    const mapLayer = L.imageOverlay('/assets/game/map.png', bounds, { attribution: '' });
    const mapLayerOuter = L.imageOverlay('/assets/game/map_outer.png', [[-MapHelper.mapTileHeight, -MapHelper.mapTileWidth], [MapHelper.mapHeight + MapHelper.mapTileHeight, MapHelper.mapWidth + MapHelper.mapTileWidth]], { opacity: 0.5, attribution: '' });
    const mapLayerGroup = L.layerGroup([mapLayer, mapLayerOuter]);
    this.mapLayers.map.layer = mapLayerGroup;

    // Add world images
    // Apply height offset to closer match the map layer (don't ask me why it's not aligned perfectly).
    const worldBounds = [[-2/8, 0], [MapHelper.mapHeight - 2/8, MapHelper.mapWidth]] as LatLngBoundsExpression;
    const worldOuterBounds = [[-2/8 - MapHelper.mapTileHeight, -MapHelper.mapTileWidth], [MapHelper.mapHeight - 2/8 + MapHelper.mapTileHeight, MapHelper.mapWidth + MapHelper.mapTileWidth]] as LatLngBoundsExpression;
    const worldLayer = L.imageOverlay('/assets/game/maps/basic/full.png', worldBounds, { attribution: '' });
    const worldLayerOuter = L.imageOverlay('/assets/game/maps/basic/outer.png', worldOuterBounds, { opacity: 0.5, attribution: '' });
    const worldLayerGroup = L.layerGroup([worldLayer, worldLayerOuter]);
    this.mapLayers.world.layer = worldLayerGroup;

    const exploredLayer = L.imageOverlay('/assets/game/maps/explored/full.png', worldBounds, { attribution: 'World layer by <a href="https://github.com/duncathan/" target="_blank">duncathan_salt</a>' });
    const exploredLayerOuter = L.imageOverlay('/assets/game/maps/explored/outer.png', worldOuterBounds, { opacity: 0.5, attribution: '' });
    const exploredLayerGroup = L.layerGroup([exploredLayer, exploredLayerOuter]);
    this.mapLayers.explored.layer = exploredLayerGroup;

    const brightLayer = L.imageOverlay('/assets/game/maps/bright/full.png', worldBounds, { attribution: 'World layer by <a href="https://miomoto.de/" target="_blank">Mio Moto</a>' });
    const brightLayerOuter = L.imageOverlay('/assets/game/maps/bright/outer.png', worldOuterBounds, { opacity: 0.5, attribution: '' });
    const brightLayerGroup = L.layerGroup([brightLayer, brightLayerOuter]);
    this.mapLayers.bright.layer = brightLayerGroup;

    // Add tile borders
    const borderLayerGroup = L.layerGroup();
    for (let tx = 0; tx < MapHelper.tilesX; tx++) {
      for (let ty = 0; ty < MapHelper.tilesY; ty++) {
        L.rectangle([[ty * MapHelper.mapTileHeight, tx * MapHelper.mapTileWidth],
          [(ty + 1) * MapHelper.mapTileHeight, (tx + 1) * MapHelper.mapTileWidth]
        ], { color: '#f008', weight: 1, fillOpacity: 0 }).addTo(borderLayerGroup);
      }
    }
    this.mapLayers.border.layer = borderLayerGroup;

    // Add grid coordinates
    const gridCoordLayer = L.layerGroup();
    for (let x = 0; x < MapHelper.tilesX; x++) {
      L.tooltip({
        content: String.fromCharCode(65 + x),
        className: 'leaflet-tooltip-border',
        direction: 'top',
        permanent: true
      }).setLatLng([MapHelper.mapHeight, (x + 0.5) * MapHelper.mapTileWidth]).addTo(gridCoordLayer);
    }
    for (let y = 0; y < MapHelper.tilesY; y++) {
      L.tooltip({
        content: String(y + 1),
        className: 'leaflet-tooltip-border',
        direction: 'left',
        permanent: true
      }).setLatLng([(15.5 - y) * MapHelper.mapTileHeight, 0]).addTo(gridCoordLayer);
    }
    const coordTooltip = L.tooltip({
      content: 'A1',
      className: 'leaflet-tooltip-border',
      direction: 'top',
      permanent: true,
      sticky: true
    }).setLatLng([-10000,0]).addTo(gridCoordLayer);
    this.mapLayers.coords.layer = gridCoordLayer;

    // Show coordinates on mouse move.
    this.map.on('mousemove', (event: L.LeafletMouseEvent) => {
      if (!this.mapLayers.coords.visible) { return; }
      const x = Math.floor(event.latlng.lng / MapHelper.mapTileWidth);
      const y = Math.floor(event.latlng.lat / MapHelper.mapTileHeight);
      coordTooltip.setOpacity(x < 0 || x > 15 || y < 0 || y > 15 ? 0 : 1);
      const xChar = String.fromCharCode(65 + x);
      coordTooltip.setContent(`${xChar}${16 - y}`);
      coordTooltip.setLatLng([(y+1) * MapHelper.mapTileHeight, (x + 0.5) * MapHelper.mapTileWidth]);
    });

    // Show visible layers.
    this.mapLayers.map.visible && this.showMapLayer('map', true);
    this.mapLayers.world.visible && this.showMapLayer('world', true);
    this.mapLayers.explored.visible && this.showMapLayer('explored', true);
    this.mapLayers.bright.visible && this.showMapLayer('bright', true);
    this.mapLayers.border.visible && this.mapLayers.border.layer.addTo(this.map);
    this.mapLayers.coords.visible && this.mapLayers.coords.layer.addTo(this.map);

    // Copy coordinates on click in dev mode.
    if (isDevMode() || document.cookie.indexOf('mapCoords') !== -1) {
      this.map.on('click', (event: L.LeafletMouseEvent) => {
        navigator.clipboard.writeText(`[${(Math.floor(event.latlng.lat) + 0.5).toFixed(1)}, ${(Math.floor(event.latlng.lng) + 0.5).toFixed(1)}],\n`);
      });
    }

    // Draw markers
    this.markerLayers['egg'] = this.createMarkers(this.markers.egg, 'Egg', 'egg', 'hue-rotate(205deg)');
    this.markerLayers['key'] = this.createMarkers(this.markers.key, 'Key', 'key', 'hue-rotate(310deg)');
    this.markerLayers['door'] = this.createMarkers(this.markers.door, 'Door', 'door', 'hue-rotate(310deg)');
    this.markerLayers['item'] = this.createMarkers(this.markers.item, 'Item', 'item', 'hue-rotate(270deg)');
    this.markerLayers['bunny'] = this.createMarkers(this.markers.bunny, 'Bunny', 'bunny', 'hue-rotate(310deg)');
    this.markerLayers['telephone'] = this.createMarkers(this.markers.telephone, 'Telephone', 'telephone', 'hue-rotate(295deg)');
    this.markerLayers['teleporter'] = this.createMarkers(this.markers.teleporter, 'Teleporter', 'teleporter', 'hue-rotate(270deg)');
    this.markerLayers['match'] = this.createMarkers(this.markers.match, 'Match', 'match', 'hue-rotate(45deg)');
    this.markerLayers['candle'] = this.createMarkers(this.markers.candle, 'Candle', 'candle', 'hue-rotate(0deg)');
    this.markerLayers['flame'] = this.createMarkers(this.markers.flame, 'Flame', 'flame', 'hue-rotate(178deg) brightness(0.65)');
    this.markerLayers['pipe'] = this.createMarkers(this.markers.pipe, 'Pipe', 'pipe', 'hue-rotate(0deg)');
    this.markerLayers['medal'] = this.createMarkers(this.markers.medal, 'Medal', 'medal-s', 'hue-rotate(160deg)');
    this.markerLayers['totem'] = this.createMarkers(this.markers.totem, 'Totem', 'totem', 'grayscale(100%)');
    this.markerLayers['cheatSecret'] = this.createMarkers(this.markers.cheatSecret, 'Secret', 'controller', 'hue-rotate(210deg) brightness(0.5)');
    this.markerLayers['explosive'] = this.createMarkers(this.markers.explosive, 'Explosive', 'tnt', 'hue-rotate(-30deg) brightness(0.7)');
    this.markerLayers['berry'] = this.createMarkers(this.markers.berry, 'Berry', 'berry', 'hue-rotate(310deg) brightness(1.5)');
    this.markerLayers['blueberry'] = this.createMarkers(this.markers.blueberry, 'Blueberry', 'blueberry', 'hue-rotate(310deg) brightness(1.5)');
    this.markerLayers['firecracker'] = this.createMarkers(this.markers.firecracker, 'Firecracker', 'firecracker', 'hue-rotate(0deg) brightness(0.7)');
    this.markerLayers['chinchilla'] = this.createMarkers(this.markers.chinchilla, 'Chinchilla', 'chinchilla', 'grayscale(100%) brightness(0.7)');
    this.markerLayers['bubbleBird'] = this.createMarkers(this.markers.bubbleBird, 'Bubble Bird', 'bird', 'hue-rotate(40deg) brightness(1.5)');
    this.markerLayers['yellowFlower'] = this.createMarkers(this.markers.yellowFlower, 'Yellow Flower', 'flower-yellow', 'hue-rotate(40deg) brightness(1.2)');

    for (const key in this.markerLayers) {
      this.markerLayersCount[key as MarkerType] = this.markerLayers[key as MarkerType].getLayers().length;
    }

    // Render markers with delay to prevent browser from freezing.
    const markersToShow = Object.keys(this.markerLayersVisible).filter(key => this.markerLayersVisible[key as MarkerType]).reverse() as Array<MarkerType>;
    const popRenderMarkers = () => setTimeout(() => {
      const markerLayer = markersToShow.pop();
      if (!markerLayer) { return; }
      if (this.markerLayersVisible[markerLayer]) {
        this.markerLayers[markerLayer as MarkerType].addTo(this.map);
      }
      if (markersToShow.length) { popRenderMarkers(); }
    }, 50);
    popRenderMarkers();

    this.map.on('moveend', () => { this.saveParamsToQuery(); });
  }

  private async loadCustomMarkers(): Promise<void> {
    const oldVisible = new Set<string>();
    this.customMarkers?.forEach(m => {
      if (m.visible) { oldVisible.add(m.name); }
      m.layer.removeFrom(this.map);
    });
    this.customMarkers = [];

    MapHelper.createMarkerIcon('question', { bgFilter: 'hue-rotate(220deg)' });
    const icon = MapHelper.getMarkerIcon('question');
    const groups = await db.markerGroups.toArray();
    for (const group of groups) {
      const layer = L.layerGroup();

      const markers = await db.markers.where('groupId').equals(group.id!).toArray();
      for (const marker of markers) {
        const m = L.marker(marker.coords as MarkerCoords, { icon }).addTo(layer);
        const popup = L.popup({
          content: group.name,
          offset: [0, 0]
        });
        m.bindPopup(popup);

      }

      const visible = oldVisible.has(group.name);
      if (visible) { layer.addTo(this.map); }

      this.customMarkers.push({
        id: group.id!,
        name: group.name,
        layer,
        count: markers.length,
        visible
      });
    }
  }

  private createMarkers(markers: Array<IMarker>, label: string, icon: string, bgFilter: string): L.LayerGroup {
    const popupMarkers = new Map<L.Popup, IMarker>();
    // Draw lines to other coordinates of marker.
    let lineLayer = L.layerGroup().addTo(this.map);
    this.map.on('popupopen', (evt: L.PopupEvent) => {
      lineLayer.clearLayers();

      const m = popupMarkers.get(evt.popup);
      if (!m) { return; }

      const destination = (m as IDestinationMarker).destination;
      const sequence = (m as ISequenceMarker).sequence;

      const pos = evt.popup.getLatLng()!;
      const coords = typeof m.coords?.[0] === 'number'
        ? [m.coords] as Array<MarkerCoords>
        : m.coords as Array<MarkerCoords>;

      if (destination)  {
        // Draw line from pos to destination.
        const dest = typeof destination[0] === 'number' ? [destination] as Array<MarkerCoords> : destination as Array<MarkerCoords>;
        if (dest.length === 1) {
          L.polyline([pos, dest[0]], { color: '#fff', weight: 3, dashArray: '20, 10' }).addTo(lineLayer);
        } else if (dest.length === coords.length) {
            dest.forEach((d, i) => {
            const color = `hsl(${i * 35}, 70%, 65%)`;
            L.polyline([coords[i], d], { color, weight: 4, dashArray: '20, 10' }).addTo(lineLayer);
            });
        }
      } else if (sequence) {
        // Draw sequence of lines.
        sequence.forEach((coord, i) => {
          if (i === 0) { return; }
          const prev = sequence[i - 1];
          L.polyline([prev, coord], { color: '#fff', weight: 3, dashArray: '20, 10' }).addTo(lineLayer);
        });
      } else {
        // Draw line to all other coords.
        coords?.forEach((coord, i) => {
          if (coord[0] === pos.lat && coord[1] === pos.lng) { return; }
          // Draw line from pos to coord.
          L.polyline([pos, coord], { color: '#fff', weight: 3, dashArray: '20, 10' }).addTo(lineLayer);
        });
      }
    });
    this.map.on('popupclose', (evt: L.PopupEvent) => {
      lineLayer.clearLayers();
    });

    // Draw markers
    const layers = L.layerGroup();
    markers.forEach(m => {
      if (Array.isArray(m)) {
        L.marker(m as unknown as MarkerCoords).addTo(layers);
      }
      // Create icon for marker.
      const useIcon = m.icon || icon;
      MapHelper.createMarkerIcon(useIcon, { bgFilter });
      const coords = m.coords && typeof m.coords[0] === 'number'
        ? [m.coords] as Array<MarkerCoords>
        : m.coords ? [...m.coords] as Array<MarkerCoords> : [];

      const markers: Array<L.Marker> = [];
      coords?.forEach(coord => {
        const marker = L.marker(coord, {
          icon: m.found ? MapHelper.getMarkerIcon(`${useIcon}-found`) : MapHelper.getMarkerIcon(useIcon),
        }).addTo(layers);
        markers.push(marker);

        const popup = L.popup({
          content: _marker => MapHelper.createMarkerPopup(m, { defaultText: label }),
          offset: [0, -37]
        });
        marker.bindPopup(popup);
        popupMarkers.set(popup, m);

        marker.on('dblclick', evt => {
          DomEvent.stop(evt);
          m.found = !m.found;

          const mIcon = m.found ? MapHelper.getMarkerIcon(`${useIcon}-found`) : MapHelper.getMarkerIcon(useIcon);
          markers.forEach(n => {
            n.setIcon(mIcon);
          });
          this.saveStorage();
        });
      });
    });

    return layers;
  }

  // #region Storage

  private loadStorage(): void {
    const mapLayerName = (localStorage.getItem('map.layers') || 'map').split(',').filter(l=>l) as Array<MapLayerName>;
    mapLayerName.forEach(name => this.mapLayers[name].visible = true);

    const found = new Set(JSON.parse(localStorage.getItem('map.found')  || '[]'));
    for (const group of Object.values(this.markers)) {
      for (const marker of group) {
        marker.found = found.has(marker.id);
      }
    }

    const layers = JSON.parse(localStorage.getItem('map.markers') || '[]');
    layers?.forEach((layer: string) => {
      this.markerLayersVisible[layer as MarkerType] = true;
    });
  }

  private saveStorage(): void {
    localStorage.setItem('map.layers', Object.keys(this.mapLayers).filter(key => this.mapLayers[key as MapLayerName].visible).join(','));

    const markers = Object.values(this.markers).flat();
    const found = markers.filter(m => m.found).map(m => m.id);
    localStorage.setItem('map.found', JSON.stringify(found));

    const layers = Object.keys(this.markerLayersVisible).filter(key => this.markerLayersVisible[key as MarkerType]);
    localStorage.setItem('map.markers', JSON.stringify(layers));
  }

  // #endregion

  // #region URL

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

  // #endregion
}
