import { Routes } from '@angular/router';
import { JsonComponent } from '../componentes/json/json.component';
import { AppComponent } from './app.component';
import { MainComponent } from '../componentes/main/main.component';
import { LoginComponent } from '../componentes/login/login.component';

export const routes: Routes = [
  { path: 'login/:empresa', component: LoginComponent },
  { path: '', redirectTo :'main/', pathMatch:'prefix' },
  { path: 'main/:nombreJson', component: MainComponent },
  { path: '**', redirectTo :'main/', pathMatch:'prefix' },
];
