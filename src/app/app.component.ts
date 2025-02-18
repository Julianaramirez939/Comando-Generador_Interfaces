import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgSelectComponent } from "../componentes/ng-select/ng-select.component";
import { BotonComponent } from "../componentes/boton/boton.component";
import { BusquedaComponent } from "../componentes/busqueda/busqueda.component";
import { JsonComponent } from "../componentes/json/json.component";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NgSelectComponent, BotonComponent, BusquedaComponent, JsonComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'fronted-interfaces';
}
