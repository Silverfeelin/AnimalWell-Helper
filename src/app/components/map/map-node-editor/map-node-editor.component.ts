import { Component, Input, NgZone, OnInit } from '@angular/core';
import { MapHelper } from '@src/app/helpers/map-helper';
import { DataService } from '@src/app/services/data.service';
import L, { DomEvent } from 'leaflet';
import { INode } from '../node.interface';

@Component({
  selector: 'app-map-node-editor',
  standalone: true,
  imports: [],
  templateUrl: './map-node-editor.component.html',
  styleUrl: './map-node-editor.component.scss'
})
export class MapNodeEditorComponent implements OnInit {
  @Input() map!: L.Map;

  private _editMode = false;
  private _rendered = false;

  constructor(
    private readonly _dataService: DataService,
    private readonly _zone: NgZone
  ) { }

  ngOnInit(): void {
    (window as any).enableNodeEditor = () => this._zone.run(() => {
      this._editMode = true;
      this.render();
    });
    (window as any).enableNodeViewer = () => this._zone.run(() => {
      this.render();
    });

    if (document.cookie.indexOf('nodeEditor') !== -1) { (window as any).enableNodeEditor(); }
  }

  private render(): void {
    if (this._rendered) { return; }
    this._rendered = true;

    window.addEventListener('beforeunload', evt => {
      evt.preventDefault();
      evt.returnValue = '';
    });

    document.body.insertAdjacentHTML('beforeend', `<style>
  .div-invis{background-color:transparent;}
  .node-circle {
    width:24px; height:24px; border-radius:500px; background-color:#0ff; border:2px solid #000;
    position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
    z-index: 1;
  }
  .node-direction {
    width:12px; height:12px; border-radius:500px; background-color:#080; border:2px solid #000;
    position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
    z-index: 2;
  }

  .bg-green{background-color:green!important;}
</style>`);

    // Icons
    const icon = L.divIcon({ html: '<div class="node-circle"></div>', className: 'div-invis' });
    const iconSelected = L.divIcon({ html: '<div class="node-circle bg-green"></div>', className: 'div-invis' });

    // Pane for rendering direction markers above node markers.
    this.map.createPane('directionPane').style.zIndex = '601';

    let currentNode: any;
    const onMarkerClick = (evt: L.LeafletMouseEvent, node: INode) => {
      if (!this._editMode) { return; }

      // Deselect
      if (currentNode && currentNode === node) {
        currentNode.marker.setIcon(icon);
        currentNode = null;
        return;
      }

      // Add or remove line
      if (evt.originalEvent.ctrlKey) {
        if (currentNode.connected.has(node)) {
          currentNode.connected.delete(node);
          node.connected.delete(currentNode);
        } else {
          currentNode.connected.add(node);
          node.connected.add(currentNode);
        }
        drawLines();
        return;
      }

      // Change node
      currentNode?.marker.setIcon(icon);
      currentNode = node;
      currentNode.marker.setIcon(iconSelected);
    };

    const onMarkerKeydown = (evt: L.LeafletKeyboardEvent, node: INode) => {
      if (!this._editMode) { return; }

      if (evt.originalEvent.key !== 'Delete') { return; }
      DomEvent.stop(evt);
      this.map.removeLayer(node.marker!);
      nodes.splice(nodes.indexOf(node), 1);
      node.connected.forEach(n => n.connected.delete(node));
      if (currentNode === node) { currentNode = null; }
      drawLines();
    };

    let newId = 1;
    const nodes: Array<INode> = this._dataService.getNodes();
    nodes.forEach(node => {
      node.marker = L.marker(node.coords, { icon }).addTo(this.map);
      node.marker.on('click', evt => onMarkerClick(evt, node));
      node.marker.on('keydown', evt => onMarkerKeydown(evt, node));
      newId = Math.max(newId, node.id + 1);
    });

    const lineLayer = L.layerGroup().addTo(this.map);
    const latLng0 = L.latLng(0, 0);
    const latLng1 = L.latLng(MapHelper.mapTileHeight, MapHelper.mapTileWidth);
    const latLng15 = L.latLng(MapHelper.mapTileHeight * (MapHelper.tilesY - 1), MapHelper.mapTileWidth * (MapHelper.tilesX - 1));
    const latLng16 = L.latLng(MapHelper.mapTileHeight * MapHelper.tilesY, MapHelper.mapTileWidth * MapHelper.tilesX);
    const drawLines = () => {
      lineLayer.clearLayers();
      const handledNodes = new Set<INode>();
      nodes.forEach(node => {
        handledNodes.add(node);
        node.connected.forEach(n => {
          const latLngA = node.marker!.getLatLng();
          let latLngB = n.marker!.getLatLng();

          // Handle wrap around.
          let wrapped = true;
          if (latLngA.lat < latLng1.lat && latLngB.lat > latLng15.lat) {
            latLngB = L.latLng(latLng0.lat - 8, latLngB.lng);
          } else if (latLngA.lat > latLng15.lat && latLngB.lat < latLng1.lat) {
            latLngB = L.latLng(latLng16.lat + 8, latLngB.lng);
          } else if (latLngA.lng < latLng1.lng && latLngB.lng > latLng15.lng) {
            latLngB = L.latLng(latLngB.lat, latLng0.lng - 8);
          } else if (latLngA.lng > latLng15.lng && latLngB.lng < latLng1.lng) {
            latLngB = L.latLng(latLngB.lat, latLng16.lng + 8);
          } else {
            wrapped = false;
          }

          // Draw line between nodes.
          if (wrapped) {
            L.polyline([latLngA, latLngB], { color: '#888', weight: 5 }).addTo(lineLayer);
          } else {
            L.polyline([latLngA, latLngB], { color: '#fff', weight: 5 }).addTo(lineLayer);
          }

          // Draw dot indication direction of connection.
          const dist = 1;
          const latDiff = latLngB.lat - latLngA.lat;
          const lngDiff = latLngB.lng - latLngA.lng;
          const latLngB2 = L.latLng(latLngB.lat - (latDiff * dist / this.map.distance(latLngA, latLngB)), latLngB.lng - (lngDiff * dist / this.map.distance(latLngA, latLngB)));
          const directionMarker = L.marker(latLngB2, { pane: 'directionPane', icon: L.divIcon({ html: '<div class="node-direction"></div>', className: 'div-invis' }) }).addTo(lineLayer);
          directionMarker.addEventListener('click', evt => {
            if (!this._editMode) { return; }
            node.connected.delete(n);
            drawLines();
          });
        });
      });
    };
    drawLines();

    if (this._editMode) {
      const saveDiv = document.createElement('div');
      document.body.appendChild(saveDiv);
      saveDiv.style.position = 'fixed';
      saveDiv.style.bottom = '20px';
      saveDiv.style.right = '5px';
      saveDiv.style.backgroundColor = '#444';
      saveDiv.style.padding = '5px';
      saveDiv.style.cursor = 'pointer';
      saveDiv.style.zIndex = '99999';
      saveDiv.innerText = 'Save nodes';
      saveDiv.addEventListener('click', () => {
        const http = new XMLHttpRequest();
        http.open('POST', 'http://localhost:4300', true);
        const model = nodes.map(node => {
          return {
            id: node.id,
            coords: [node.marker!.getLatLng().lat, node.marker!.getLatLng().lng],
            connected: [...node.connected].map(n => n.id)
          };
        });
        http.send(JSON.stringify(model));
      });
    }

    this.map.on('click', e => {
      if (!this._editMode) { return; }

      const marker = L.marker(e.latlng, { icon }).addTo(this.map);
      const node: INode = {
        id: newId++,
        tx: Math.floor(e.latlng.lng / MapHelper.mapTileWidth),
        ty: Math.floor(e.latlng.lat / MapHelper.mapTileHeight),
        coords: [e.latlng.lat, e.latlng.lng],
        connected: new Set(),
        marker
      };
      nodes.push(node);

      if (e.originalEvent.ctrlKey && currentNode) {
        currentNode.connected.add(node);
        node.connected.add(currentNode);
        drawLines();

        if (e.originalEvent.shiftKey) {
          currentNode.marker.setIcon(icon);
          currentNode = node;
          currentNode.marker.setIcon(iconSelected);
        }
      }

      marker.on('keydown', evt => onMarkerKeydown(evt, node));
      marker.on('click', evt => onMarkerClick(evt, node));
    });
  }
}
