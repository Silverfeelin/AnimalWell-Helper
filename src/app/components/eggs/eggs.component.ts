import { Component } from '@angular/core';
import { EggMapComponent } from './egg-map/egg-map.component';
import { EggShrineComponent } from './egg-shrine/egg-shrine.component';

@Component({
  selector: 'app-eggs',
  standalone: true,
  imports: [
    EggShrineComponent,
    EggMapComponent
  ],
  templateUrl: './eggs.component.html',
  styleUrl: './eggs.component.scss'
})
export class EggsComponent {
  constructor() {

  }

}
