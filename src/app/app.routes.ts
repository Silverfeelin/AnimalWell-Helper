import { Routes } from '@angular/router';
import { MapComponent } from './components/map/map.component';
import { EggsComponent } from './components/eggs/eggs.component';
import { AppLayoutComponent } from './components/layout/app-layout/app-layout.component';
import { EmbedLayoutComponent } from './components/layout/embed-layout/embed-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      { path: '', redirectTo: 'eggs', pathMatch: 'full' },
      { path: 'eggs', component: EggsComponent }
    ]
  },
  {
    path: '',
    component: EmbedLayoutComponent,
    children: [
      { path: 'map', component: MapComponent }
    ]
  }
];
