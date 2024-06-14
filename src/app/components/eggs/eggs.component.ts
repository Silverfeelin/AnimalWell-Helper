import { Component } from '@angular/core';
import { EggMapComponent } from './egg-map/egg-map.component';
import { EggShrineComponent } from './egg-shrine/egg-shrine.component';
import { DataService } from '@src/app/services/data.service';
import { IEgg } from './egg.interface';
import { InventoryComponent } from '../inventory/inventory.component';

@Component({
  selector: 'app-eggs',
  standalone: true,
  imports: [
    InventoryComponent,
    EggShrineComponent,
    EggMapComponent
  ],
  templateUrl: './eggs.component.html',
  styleUrl: './eggs.component.scss'
})
export class EggsComponent {
  eggs: Array<IEgg> = [];
  constructor(
    private readonly _dataService: DataService
  ) {
    this.eggs = this._dataService.getEggs();
  }
}
