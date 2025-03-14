import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ObtenerDataService } from '../servicios/obtener-data.service';
import { CommonModule } from '@angular/common';
import { JsonComponent } from "../componentes/json/json.component";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'fronted-interfaces';
 
}
