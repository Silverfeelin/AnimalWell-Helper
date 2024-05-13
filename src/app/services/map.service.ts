import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MapService {
  onGotoQuadrant = new Subject<{ x: number, y: number }>();
  onGotoTile = new Subject<{ x: number, y: number }>();

  constructor() {

  }

  gotoQuadrant(x: number, y: number): void {
    this.onGotoQuadrant.next({ x, y });
  }

  gotoTile(x: number, y: number): void {
    this.onGotoTile.next({ x, y });
  }
}
