import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule} from '@angular/forms';

@Component({
  selector: 'app-busqueda',
  imports: [FormsModule, CommonModule],
  templateUrl: './busqueda.component.html',
  styleUrl: './busqueda.component.css'
})
export class BusquedaComponent {
  buscar: string = '';  // Variable para enlazar el valor del input
  items = ['Manzana', 'Plátano', 'Pera', 'Uva', 'Fresa'];  // Lista de ejemplo

  // Filtra los elementos según el texto que el usuario ingresa
  filtrarItems() {
    return this.items.filter(item => item.toLowerCase().includes(this.buscar.toLowerCase()));
  }
}
