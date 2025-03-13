import { Routes } from '@angular/router';
import { JsonComponent } from '../componentes/json/json.component';
import { AppComponent } from './app.component';

export const routes: Routes = [
  { path: 'aplicaciones', component: AppComponent },
  { path: '', component: JsonComponent },
  { path: ':nombreJson', component: JsonComponent },
  { path: '**', component: JsonComponent },
];
