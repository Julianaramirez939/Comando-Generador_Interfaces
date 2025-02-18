import { Component } from '@angular/core';
import {NgSelectModule} from '@ng-select/ng-select'
@Component({
  selector: 'app-ng-select',
  imports: [NgSelectModule],
  templateUrl: './ng-select.component.html',
  styleUrl: './ng-select.component.css'
})
export class NgSelectComponent {
  opciones = [
    { id: 1, nombre: 'Opción 1' },
    { id: 2, nombre: 'Opción 2' },
    { id: 3, nombre: 'Opción 3' }
  ];
  
}
