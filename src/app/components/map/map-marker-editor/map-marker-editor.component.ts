import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { MapHelper } from '@src/app/helpers/map-helper';
import { db } from '@src/app/services/db';
import L, { LatLng } from 'leaflet';

@Component({
  selector: 'app-map-marker-editor',
  standalone: true,
  imports: [],
  templateUrl: './map-marker-editor.component.html',
  styleUrl: './map-marker-editor.component.scss'
})
export class MapMarkerEditorComponent implements OnInit, OnDestroy {
  @Input() map!: L.Map;
  @Input() groupName?: string;

  @Output() readonly markerGroupCreated = new EventEmitter<string>();
  @Output() readonly markerGroupUpdated = new EventEmitter<string>();

  showingRegularMarkers = false;

  layerGroup: L.LayerGroup = L.layerGroup();
  markers = new Set<L.Marker>();

  constructor() {
  }

  ngOnInit(): void {
    if (!this.map.getPane('customMarkerEditPane')) {
      this.map.createPane('customMarkerEditPane').style.zIndex = '651';
    }
    this.updateMarkerPaneVisibility();
    this.map.getPane('customMarkerPane')!.style.display = 'none';

    this.layerGroup.addTo(this.map);
    this.map.on('click', e => {
      this.addMarker(e.latlng);
    });

    if (this.groupName) {
      db.markerGroups.where('name').equals(this.groupName).first().then(group => {
        if (!group) { return; }
        db.markers.where('groupId').equals(group.id!).each(marker => {
          this.addMarker(new LatLng(marker.coords[0], marker.coords[1]));
        });
      });
    }
  }

  ngOnDestroy(): void {
    this.layerGroup.removeFrom(this.map);
    this.layerGroup.remove();

    this.showingRegularMarkers = true;
    this.updateMarkerPaneVisibility();
    this.map.getPane('customMarkerPane')!.style.display = '';
  }

  toggleRegularMarkers(): void {
    this.showingRegularMarkers = !this.showingRegularMarkers;
    this.updateMarkerPaneVisibility();
  }

  async save(): Promise<void> {
    if (this.markers.size === 0) {
      alert('No markers to save! Add some markers first. Or delete from the menu.');
    }

    if (this.groupName) {
      await this.saveUpdatedGroup();
    } else {
      await this.saveNewGroup();
    }
  }

  async saveNewGroup(): Promise<void> {
    const name = prompt('Enter a name for the marker group');
    if (!name) { return; }

    if (await db.markerGroups.where('name').equals(name).first()) {
      alert('Group already exists! Choose a different name.');
      return;
    }

    // Add all markers in a new group.
    const groupId = await db.markerGroups.add({ name });
    for (const marker of this.markers) {
      await db.markers.add({
        groupId,
        coords: [marker.getLatLng().lat, marker.getLatLng().lng]
      });
    }

    this.markerGroupCreated.emit(name);
  }

  async saveUpdatedGroup(): Promise<void> {
    if (!this.groupName) { return; }
    const group = await db.markerGroups.where('name').equals(this.groupName).first();
    if (!group) { alert('Group not found! Something broke.'); return; }

    // Delete all markers in the group.
    await db.markers.where('groupId').equals(group.id!).delete();

    // Add all markers in the group.
    for (const marker of this.markers) {
      const latlng = marker.getLatLng();
      await db.markers.add({
        groupId: group.id!,
        coords: [latlng.lat, latlng.lng]
      });
    }

    this.markerGroupUpdated.emit(this.groupName);
  }

  addMarker(latlng: LatLng): void {
    MapHelper.createMarkerIcon('question', { bgFilter: 'hue-rotate(220deg)' });
    latlng = this.roundLatLng(latlng);
    const marker = L.marker(latlng, {
      pane: 'customMarkerEditPane',
      icon: MapHelper.getMarkerIcon('question'),
      draggable: true,
      autoPan: true
    }).addTo(this.layerGroup);

    marker.on('dragend', () => {
      marker.setLatLng(this.roundLatLng(marker.getLatLng()));
    });
    const popup = L.popup({
      content: e => {
        const div = document.createElement('div');
        const btn = document.createElement('button');
        div.appendChild(btn);
        btn.classList.add('border');
        btn.innerText = 'Delete';
        btn.onclick = () => {
          this.map.removeLayer(marker);
          this.markers.delete(marker);
        };
        return div;
      }
    });
    marker.bindPopup(popup);

    this.markers.add(marker);
  }

  private roundLatLng(latlng: LatLng): LatLng {
    return new LatLng(Math.floor(latlng.lat) + 0.5, Math.floor(latlng.lng) + 0.5);
  }

  private updateMarkerPaneVisibility(): void {
    this.map.getPane('markerPane')!.style.display = this.showingRegularMarkers ? '' : 'none';
  }
}
