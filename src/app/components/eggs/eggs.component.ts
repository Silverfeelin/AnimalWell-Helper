import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, OnInit, Output } from '@angular/core';
import { IEgg } from './egg.interface';
import { EggControlsComponent } from './egg-controls/egg-controls.component';
import { HttpClient } from '@angular/common/http';

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
    private readonly _http: HttpClient,
    private readonly _changeDetectorRef: ChangeDetectorRef
  ) {

  }

  ngOnInit(): void {
    this._http.get<{items: Array<IEgg>}>('/assets/eggs.json').subscribe(data => {
      this.eggs = data.items;
      this.loadStorage();
      this._changeDetectorRef.markForCheck();
    });
  }

  selectEgg(egg: IEgg): void {
    this.selectedEgg = egg;
  }

  toggleFound(egg: IEgg): void {
    egg.obtained = !egg.obtained;
    this.saveStorage();
  }

  onEggUpdated(egg: IEgg): void {
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
      obtained: this.eggs.filter(egg => egg.obtained).map(egg => egg.code)
    };
    localStorage.setItem('eggs', JSON.stringify(data));
  }

  private loadStorage(): void {
    const data = JSON.parse(localStorage.getItem('eggs') || '{}');
    const obtained = new Set(data.obtained || []);
    this.eggs.forEach(egg => {
      egg.obtained = obtained.has(egg.code);
    });
  }
}