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

  @Output() eggUpdated = new EventEmitter<IEgg>();

  constructor(
    private readonly _eventService: EventService
  ) { }

  toggleFound(): void {
    if (!this.egg) { return; }
    this.egg.obtained = !this.egg.obtained;
    this.eggUpdated.emit(this.egg);
  }

  toggleVisible(): void {
    if (!this.egg) { return; }
    this.egg.visible = !this.egg.visible;
    this._eventService.eggVisibilityChanged.next(this.egg);
    this.eggUpdated.emit(this.egg);
  }
}
