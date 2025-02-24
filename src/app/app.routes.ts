import { Routes } from '@angular/router';
import { JsonComponent } from '../componentes/json/json.component';

export const routes: Routes = [
  { path: '', component: JsonComponent },
  { path: '*', component: JsonComponent },
  { path: ':nombreJson', component: JsonComponent }, 
];
