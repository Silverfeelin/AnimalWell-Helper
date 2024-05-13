import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { IEgg } from '../egg.interface';
import { EventService } from '../../../services/event.service';
import { CommonModule } from '@angular/common';

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
    private readonly _elementRef: ElementRef<HTMLElement>
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    this._elementRef.nativeElement?.querySelectorAll('.spoiled').forEach(e => e.classList.remove('spoiled'));
  }

  toggleFound(): void {
    if (!this.egg) { return; }
    this.egg.obtained = !this.egg.obtained;
    this._eventService.eggsUpdated.next([this.egg]);
  }

  toggleVisible(): void {
    if (!this.egg) { return; }
    this.egg.visible = !this.egg.visible;
    this._eventService.eggVisibilityChanged.next({ egg: this.egg, navigate: true });
    this._eventService.eggsUpdated.next([this.egg]);
  }
}
