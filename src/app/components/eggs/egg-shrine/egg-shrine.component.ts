import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { EventService } from '@src/app/services/event.service';
import { IEgg } from '../egg.interface';
import { EggControlsComponent } from '../egg-controls/egg-controls.component';

@Component({
  selector: 'app-egg-shrine',
  standalone: true,
  imports: [
    EggControlsComponent
  ],
  templateUrl: './egg-shrine.component.html',
  styleUrl: './egg-shrine.component.scss'
})
export class EggShrineComponent {
  @Input() eggs: Array<IEgg> = [];

  selectedEgg?: IEgg;

  constructor(
    private readonly _eventService: EventService,
    private readonly _http: HttpClient,
    private readonly _changeDetectorRef: ChangeDetectorRef
  ) {

  }

  ngOnInit(): void {
    this.loadStorage();

    this._eventService.onEggsUpdated.subscribe({
      next: (eggs: Array<IEgg>) => this.onEggsUpdated(eggs)
    });

    this._eventService.onEggDblClick.subscribe({
      next: (egg: IEgg) => { this.toggleFound(egg); }
    });
  }

  selectEgg(egg: IEgg): void {
    if (egg.placeholder) { this.selectedEgg = undefined; return; }
    this.selectedEgg = egg;
  }

  toggleFound(egg: IEgg): void {
    egg.obtained = !egg.obtained;
    this._eventService.onEggsUpdated.next([egg]);
    this.saveStorage();
  }

  onEggsUpdated(eggs: Array<IEgg>): void {
    this.saveStorage();
  }

  unlockAll(): void {
    if (!confirm('Are you sure you want to mark all eggs as found?')) { return; }
    this.eggs.forEach(egg => egg.obtained = true);
    this._eventService.onEggsUpdated.next(this.eggs);
  }

  lockAll(): void {
    if (!confirm('Are you sure you want to mark all eggs as missing?')) { return; }
    this.eggs.forEach(egg => egg.obtained = false);
    this._eventService.onEggsUpdated.next(this.eggs);
  }

  private saveStorage(): void {
    const data = {
      obtained: this.eggs.filter(egg => egg.obtained).map(egg => egg.code),
      visible: this.eggs.filter(egg => egg.visible).map(egg => egg.code)
    };
    localStorage.setItem('eggs', JSON.stringify(data));
  }

  private loadStorage(): void {
    const data = JSON.parse(localStorage.getItem('eggs') || '{}');
    const obtained = new Set(data.obtained || []);
    const visible = new Set(data.visible || []);
    this.eggs.forEach(egg => {
      egg.obtained = obtained.has(egg.code);
      egg.visible = visible.has(egg.code);
    });
  }
}

