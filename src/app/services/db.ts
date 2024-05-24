// db.ts
import Dexie, { Table } from 'dexie';

export interface IDbMarkerGroup {
  id?: number;
  name: string;
  hue?: string;
}

export interface IDbMarker {
  id?: number;
  groupId: number;
  coords: [number, number];
}

export class AppDatabase extends Dexie {
  markerGroups!: Table<IDbMarkerGroup, number>;
  markers!: Table<IDbMarker, number>;

  constructor() {
    super('dbWell');
    this.version(1).stores({
      markerGroups: '++id, name',
      markers: '++id, groupId',
    });
  }
}

export const db = new AppDatabase();
