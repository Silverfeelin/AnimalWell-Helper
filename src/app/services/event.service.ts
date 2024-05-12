import { Injectable } from '@angular/core';
import { IEgg } from '../components/eggs/egg.interface';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  eggsUpdated = new Subject<Array<IEgg>>();
  eggVisibilityChanged = new Subject<{egg: IEgg, navigate?: boolean}>();

  constructor() { }
}
