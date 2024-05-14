import { Injectable } from '@angular/core';
import { IEgg } from '../components/eggs/egg.interface';
import eggJson from '@src/assets/eggs.json';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  eggs: Array<IEgg>;

  constructor(
  ) {
    this.eggs = eggJson.items as Array<IEgg>;
  }
}
