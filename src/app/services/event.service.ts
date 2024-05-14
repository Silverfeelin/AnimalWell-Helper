import { Injectable } from '@angular/core';
import { IEgg } from '../components/eggs/egg.interface';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  onEggsUpdated = new Subject<Array<IEgg>>();
  onEggDblClick = new Subject<IEgg>();

  constructor() { }
}
