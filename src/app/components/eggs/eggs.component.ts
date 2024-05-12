import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { IEgg } from './egg.interface';
import { EggControlsComponent } from './egg-controls/egg-controls.component';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../services/data.service';
import { EventService } from '../../services/event.service';

@Component({
  selector: 'app-eggs',
  standalone: true,
  imports: [
    EggControlsComponent
  ],
  templateUrl: './eggs.component.html',
  styleUrl: './eggs.component.scss'
})
export class EggsComponent implements OnInit {
  selectedEgg?: IEgg;
  eggs: Array<IEgg> = [];

  constructor(
    private readonly _dataService: DataService,
    private readonly _eventService: EventService,
    private readonly _http: HttpClient,
    private readonly _changeDetectorRef: ChangeDetectorRef
  ) {

  }

  ngOnInit(): void {
    this._dataService.getEggs().subscribe(eggs => {
      this.eggs = eggs;
      this.loadStorage();
      this._changeDetectorRef.markForCheck();
    });

    this._eventService.eggsUpdated.subscribe({
      next: (eggs: Array<IEgg>) => this.onEggsUpdated(eggs)
    });
  }

  selectEgg(egg: IEgg): void {
    this.selectedEgg = egg;
  }

  toggleFound(egg: IEgg): void {
    egg.obtained = !egg.obtained;
    this.saveStorage();
  }

  onEggsUpdated(eggs: Array<IEgg>): void {
    this.saveStorage();
  }

  unlockAll(): void {
    if (!confirm('Are you sure you want to mark all eggs as found?')) { return; }
    this.eggs.forEach(egg => egg.obtained = true);
    this.saveStorage();
  }

  lockAll(): void {
    if (!confirm('Are you sure you want to mark all eggs as missing?')) { return; }
    this.eggs.forEach(egg => egg.obtained = false);
    this.saveStorage();
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
