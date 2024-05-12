import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { IEgg } from '../egg.interface';

@Component({
  selector: 'app-egg-controls',
  standalone: true,
  imports: [],
  templateUrl: './egg-controls.component.html',
  styleUrl: './egg-controls.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EggControlsComponent implements OnChanges {
  @Input() egg?: IEgg;

  ngOnChanges(changes: SimpleChanges): void {
  }

  refreshEgg(): void {

  }
}
