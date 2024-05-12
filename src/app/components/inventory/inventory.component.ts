import { ChangeDetectionStrategy, Component, ElementRef, ViewChild } from '@angular/core';

interface IItem {
  name: string;
  obtained?: boolean;
}

interface IFlame {
  name: string;
  obtained: boolean;
}

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss'
})
export class InventoryComponent {
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;

  items: Array<IItem> = [
    { name: 'Firecrackers', obtained: false },
    { name: 'Flute', obtained: false },
    { name: 'Lantern', obtained: false },
    { name: 'Top', obtained: false },
    { name: 'Disc', obtained: false },
    { name: 'Bubble Wand', obtained: false },
    { name: 'Yoyo', obtained: false },
    { name: 'Slink', obtained: false },
    { name: 'Remote', obtained: false },
    { name: 'Bouncy Ball', obtained: false },
    { name: 'Wheel', obtained: false },
    { name: 'UV Wand', obtained: false },
  ]

  flames: Array<IFlame> = [
    { name: 'Seahorse Flame', obtained: false },
    { name: 'Dog Flame', obtained: false },
    { name: 'Chameleon Flame', obtained: false },
    { name: 'Ostrich Flame', obtained: false }
  ]

  constructor() {
    this.loadStorage();
  }

  toggleObtained(item: { obtained?: boolean }): void {
    item.obtained = !item.obtained;
    this.updateStorage();
  }

  private loadStorage(): void {
    const data = JSON.parse(localStorage.getItem('inventory') || '{}');

    const items: Record<string, boolean> = data.items ?? {};
    this.items.forEach(item => {
      item.obtained = items[item.name] || false;
    });

    const flames: Record<string, boolean> = data.flames ?? {};
    this.flames.forEach(flame => {
      flame.obtained = flames[flame.name] || false;
    });
  }

  private updateStorage(): void {
    const items = this.items.reduce((acc, item) => {
      acc[item.name] = !!item.obtained;
      return acc;
    }, {} as Record<string, boolean>);
    const flames = this.flames.reduce((acc, flame) => {
      acc[flame.name] = !!flame.obtained;
      return acc;
    }, {} as Record<string, boolean>);

    localStorage.setItem('inventory', JSON.stringify({ items, flames }));
  }
}
