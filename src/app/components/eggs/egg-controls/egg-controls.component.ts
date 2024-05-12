import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IEgg } from '../egg.interface';
import { EventService } from '../../../services/event.service';

@Component({
  selector: 'app-egg-controls',
  standalone: true,
  imports: [],
  templateUrl: './egg-controls.component.html',
  styleUrl: './egg-controls.component.scss'
})
export class EggControlsComponent {
  @Input() egg?: IEgg;

  constructor(
    private readonly _eventService: EventService
  ) { }

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
