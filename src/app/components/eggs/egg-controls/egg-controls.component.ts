import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { IEgg } from '../egg.interface';
import { EventService } from '../../../services/event.service';

@Component({
  selector: 'app-egg-controls',
  standalone: true,
  imports: [],
  templateUrl: './egg-controls.component.html',
  styleUrl: './egg-controls.component.scss'
})
export class EggControlsComponent implements OnChanges {
  @Input() egg?: IEgg;

  @Output() eggUpdated = new EventEmitter<IEgg>();

  constructor(
    private readonly _eventService: EventService
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
  }

  toggleFound(): void{
    if (!this.egg) { return; }
    this.egg.obtained = !this.egg.obtained;
    this.eggUpdated.emit(this.egg);
  }
}
