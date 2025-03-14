import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
import { LoginService } from '../../servicios/login.service'; // ✅ Importamos el servicio de login

@Component({
  selector: 'app-main',
  imports: [JsonComponent, CommonModule, JsonComponent],
  templateUrl: './main.component.html',
  styleUrl: './main.component.css',
})
export class MainComponent implements OnInit {  // ✅ Implementamos OnInit
  jsonMenu: any;
  subopcionSeleccionada: any = null;
  menuEstructurado: any[] = [];
  empresa: string = ''; // ✅ Agregamos la variable empresa
  logoUrl: string = ''; // ✅ Variable para el logo dinámico

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private obtenerDataService: ObtenerDataService,
    private loginService: LoginService, // ✅ Inyectamos el servicio de login
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.empresa = localStorage.getItem('empresa') || 'Empresa Desconocida'; // ✅ Obtener empresa
    this.obtenerLogo(); // ✅ Llamamos a la función para obtener el logo

    this.jsonMenu = await this.cargarJson();
    this.generarEstructuraMenu();
  }

  obtenerLogo() {
    const usuario = localStorage.getItem('idusuariosesion');
    const token = localStorage.getItem('token');

    if (this.empresa && usuario && token) {
      this.loginService.getLogo(this.empresa, usuario, token).subscribe({
        next: (logoResponse) => {
          this.logoUrl = logoResponse; // ✅ Guardamos el logo
          localStorage.setItem('logoUrl', logoResponse); // Guardamos en localStorage
        },
        error: () => {
          console.error('Error al obtener el logo.');
          this.logoUrl = 'https://apm.comandosoftware.com/sahv4/images/sah.png?version=133'; // ✅ Logo por defecto
        },
      });
    }
  }

  irAJson(subopcion: any) {
    console.log('subopcion', subopcion);
    this.subopcionSeleccionada = subopcion;
    const nombreJson = subopcion?.nombreJson;

    if (nombreJson) {
      this.router.navigate([`main/${nombreJson}`]);
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

    this.menuEstructurado = menus.map((menu: any) => {
      const subopciones = programas
        .filter((programa: any) => programa.id_menu === menu.id)
        .map((programa: any) => {
          const enlacePartes = programa.enlace
            ? programa.enlace.split(',')
            : [];
          const nombreJson = enlacePartes.length > 1 ? enlacePartes[1] : null;

          return {
            ...programa,
            nombreJson,
          };
        });

      return {
        ...menu,
        subopciones,
        abierto: false,
      };
    });
  }

  public toggleSubmenu(menu: any) {
    menu.abierto = !menu.abierto;
  }
}
