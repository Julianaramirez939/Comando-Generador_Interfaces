import { ChangeDetectorRef, Component } from '@angular/core';
import { JsonComponent } from '../json/json.component';
import {
  ActivatedRoute,
  Router,
  RouterEvent,
  RouterOutlet,
} from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ObtenerDataService } from '../../servicios/obtener-data.service';

@Component({
  selector: 'app-main',
  imports: [JsonComponent, CommonModule, JsonComponent],
  templateUrl: './main.component.html',
  styleUrl: './main.component.css',
})
export class MainComponent {
  jsonMenu: any;
  subopcionSeleccionada: any = null;

  public menuEstructurado: any[] = [];
  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private obtenerDataService: ObtenerDataService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.jsonMenu = await this.cargarJson();

    this.generarEstructuraMenu();
  }
  irAJson(subopcion: any) {
    console.log('subopcion', subopcion);
    this.subopcionSeleccionada = subopcion;
    const nombreJson = subopcion?.nombreJson;

    if (nombreJson) {
      this.router.navigate([`main/${nombreJson}`]); // 🔄 Fuerza la navegación después de resetear la URL
    } else {
      console.error('❌ Error: No se encontró un nombre de JSON válido.');
    }
  }

  async cargarJson() {
    let json = {};
    await fetch(`http://localhost:3000/data/aplicaciones`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `❌ No se pudo cargar el JSON: ${response.statusText}`
          );
        }
        return response.json();
      })
      .then((data) => {
        json = data;
      })
      .catch((error) => console.error('❌ Error al cargar el JSON:', error));

    return json;
  }

  async generarEstructuraMenu() {
    if (!this.jsonMenu || !Array.isArray(this.jsonMenu)) {
      console.error('❌ Error: jsonMenu no es un array válido.');
      return;
    }

    const menus = this.jsonMenu
      .filter((item: any) => item.tipo === 'menu')
      .sort((a, b) => a.posicion - b.posicion);

    const programas = this.jsonMenu
      .filter((item: any) => item.tipo === 'programa')
      .sort((a, b) => a.posicion - b.posicion);

    // ✅ Guardamos en la propiedad pública
    this.menuEstructurado = menus.map((menu: any) => {
      const subopciones = programas
        .filter((programa: any) => programa.id_menu === menu.id)
        .map((programa: any) => {
          // Extraer el nombre del JSON desde el campo enlace
          const enlacePartes = programa.enlace
            ? programa.enlace.split(',')
            : [];
          const nombreJson = enlacePartes.length > 1 ? enlacePartes[1] : null; // Posición 1

          return {
            ...programa,
            nombreJson, // 🔹 Guardamos el nombre del JSON extraído
          };
        });

      return {
        ...menu,
        subopciones,
        abierto: false, // 🔹 Control de apertura/cierre del menú
      };
    });
  }

  // ✅ Método público para alternar la visibilidad de submenús
  public toggleSubmenu(menu: any) {
    menu.abierto = !menu.abierto;
  }
}
