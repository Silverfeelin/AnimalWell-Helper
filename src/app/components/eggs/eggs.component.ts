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
  styleUrl: './eggs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
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
      this._changeDetectorRef.markForCheck();
    });
  }

  selectEgg(egg: IEgg): void {
    this.selectedEgg = egg;
  }
}
