import { Component, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventService } from '@src/app/services/event.service';
import { IEgg } from '../egg.interface';
import { MapEventService } from '@src/app/services/map-event.service';

@Component({
  selector: 'app-egg-controls',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './egg-controls.component.html',
  styleUrl: './egg-controls.component.scss'
})
export class EggControlsComponent implements OnChanges {
  @Input() egg?: IEgg;

  constructor(
    private readonly _eventService: EventService,
    private readonly _mapEventService: MapEventService,
    private readonly _elementRef: ElementRef<HTMLElement>
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    this._elementRef.nativeElement?.querySelectorAll('.spoiled').forEach(e => e.classList.remove('spoiled'));
  }

  toggleFound(): void {
    if (!this.egg) { return; }
    this.egg.obtained = !this.egg.obtained;
    this._eventService.onEggsUpdated.next([this.egg]);
  }

  toggleVisible(): void {
    if (!this.egg) { return; }
    this.egg.visible = !this.egg.visible;
    this._eventService.onEggsUpdated.next([this.egg]);
  }

  gotoQuadrant(): void {
    if (!this.egg?.coords?.[0]) { return; }
    this._mapEventService.gotoQuadrant(this.egg.coords[1], this.egg.coords[0]);
  }

  gotoTile(): void {
    if (!this.egg?.coords?.[0]) { return; }
    this._mapEventService.gotoTile(this.egg.coords[1], this.egg.coords[0]);
  }
}
