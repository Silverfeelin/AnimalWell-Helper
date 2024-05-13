import { Injectable } from '@angular/core';
import { Observable, ReplaySubject, map, of } from 'rxjs';
import { IEgg } from '../components/eggs/egg.interface';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private _eggs?: Array<IEgg>;
  private _eggSubject?: ReplaySubject<Array<IEgg>>;

  constructor(
    private readonly _http: HttpClient
  ) { }

  getEggs(): Observable<Array<IEgg>> {
    if (!this._eggSubject) {
      this._eggSubject = new ReplaySubject<Array<IEgg>>(1);
      this._http.get<{items: Array<IEgg>}>('/assets/eggs.json').subscribe(data => {
        data.items.forEach(egg => {
          // if egg.items is array
          egg.items?.forEach((item, i) => {
            if (Array.isArray(item)) {
              egg.items![i] = item.join(' or ');
            }
          });
        });
        this._eggs = data.items;
        this._eggSubject!.next(this._eggs);
      });
    }

    return this._eggSubject.asObservable();
  }
}
