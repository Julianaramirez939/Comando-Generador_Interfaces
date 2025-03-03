import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2'; // ✅ Importa SweetAlert2
import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { Campo } from '../../interfaces/campos';
import { Listado } from '../../interfaces/listado';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { ObtenerDataService } from '../../servicios/obtener-data.service';
import { ActivatedRoute } from '@angular/router';
import { fromEvent, of, Subscription, throttleTime } from 'rxjs';

@Component({
  selector: 'app-json',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './json.component.html',
  styleUrls: ['./json.component.css'],
})
export class JsonComponent implements OnInit {
  datosSecciones: any[] = [];
  jsonSeccion: any = {};
  camposMain: { [key: number]: any[] } = [];
  datos: any = {};
  gridMain: any = [];
  gridSecciones: any = [];
  mostrarListado: boolean = true;
  mostrarFormulario: boolean = true;
  mostrarConsulta: boolean = true;
  datosTablaMain: any[] = [];
  datosGridMain: any[] = [];
  mapeoColumnas: any = {};
  mapeoSecciones: any = [];
  alternaListadoFormulario: boolean = true;
  botonesGeneradosFormulario: any[] = [];
  botonesGeneradosListado: any[] = [];
  accionesListado: any[] = [];
  seccionesData: { [key: string]: { datos: any[]; offset: number } } = {};
  buscar: boolean = false;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private obtenerDataService: ObtenerDataService,
    private route: ActivatedRoute
  ) {}
  jsonMain: any;
  @ViewChild('tablaContainer', { static: false }) tablaContainer!: ElementRef;
  @ViewChildren('tablaSeccion') tablasSecciones!: QueryList<ElementRef>;
  limit = 100;
  limitSeccion = 40;

  offset = 0;
  offsetSeccion = 0;
  scrollSubscription!: Subscription;
  seccionesSubscriptions: Subscription[] = [];

  ngAfterViewInit() {
    // 🔹 Scroll para el contenedor principal
    setTimeout(() => {
      if (this.tablaContainer) {
        console.log('📌 tablaContainer encontrado:', this.tablaContainer);

        this.scrollSubscription = fromEvent(
          this.tablaContainer.nativeElement,
          'scroll'
        )
          .pipe(throttleTime(300)) // Evita llamadas excesivas
          .subscribe(() => {
            if (
              this.tablaContainer.nativeElement.scrollTop +
                this.tablaContainer.nativeElement.clientHeight >=
              this.tablaContainer.nativeElement.scrollHeight * 0.9
            ) {
              this.cargarMasDatos();
            }
          });
      } else {
        console.error('⚠️ No se encontró tablaContainer después del timeout');
      }
    }, 800);

    // 🔹 Scroll para cada sección
    setTimeout(() => {
      if (this.tablasSecciones) {
        console.log(`📌 Detectando scroll en sección `);
        console.log(`tablasSeccionesssss`, this.tablasSecciones);

        // 🔹 Esperar a que los elementos de las secciones estén listos
        this.tablasSecciones.changes.subscribe(() => {
          console.log(
            '📌 Secciones detectadas:',
            this.tablasSecciones.toArray()
          );

          this.tablasSecciones.forEach((tablasSecciones, index) => {
            fromEvent(tablasSecciones.nativeElement, 'scroll')
              .pipe(throttleTime(300))
              .subscribe(() => {
                if (
                  tablasSecciones.nativeElement.scrollTop +
                    tablasSecciones.nativeElement.clientHeight >=
                  tablasSecciones.nativeElement.scrollHeight * 0.9
                ) {
                  this.cargarMasDatosSecciones(index);
                }
              });
          });
        });
      } else {
        console.error('⚠️ No se encontraron las tablas de secciones.');
      }
    }, 600);
  }

  async cargarMasDatos() {
    this.offset++;
    let consulta = `SELECT * FROM ${this.jsonMain.tabla}`;

    if (this.jsonMain.groupBy) consulta += ` GROUP BY ${this.jsonMain.groupBy}`;
    if (this.jsonMain.orderBy) consulta += ` ORDER BY ${this.jsonMain.orderBy}`;

    consulta += ` LIMIT ${this.limit} OFFSET ${this.limit * this.offset};`;
    const dataMain: any = await this.obtenerData(consulta);

    this.datosGridMain = [...this.datosGridMain, ...dataMain];

    this.datosTablaMain = [...this.datosTablaMain, ...dataMain];

    console.log('CAMBIO OFFSET A', this.offset);
    console.log('Consulta ejecutada:', consulta);
  }
  async cargarMasDatosSecciones(index: number) {
    this.offsetSeccion++;
    if (!this.jsonMain.secciones || !this.jsonMain.secciones[index]) return;

    let seccion = this.jsonMain.secciones[index];

    // Si la sección usa formulario alterno, no cargamos más datos
    if (seccion.alternaListadoFormulario) return;

    // 🔹 Incrementamos el offset específico de la sección
    seccion.offsetSeccion = (seccion.offsetSeccion || 0) + 1;

    // 🔹 Cargamos el JSON de la sección
    const jsonSeccion: any = await this.cargarJson(seccion.origen);

    let consulta = `SELECT * FROM ${jsonSeccion.tabla}`;
    if (jsonSeccion.orderBy) {
      consulta += ` ORDER BY ${jsonSeccion.orderBy}`;
    }
    consulta += ` LIMIT ${this.limitSeccion} OFFSET ${
      this.limitSeccion * seccion.offsetSeccion
    };`;

    const dataSeccion: any = await this.obtenerData(consulta);

    // 🔹 Buscamos la sección dentro de `datosSecciones` y actualizamos `gridInfo`
    const datosSeccionIndex = this.datosSecciones.findIndex(
      (s) => s.nombre === seccion.nombre
    );

    if (datosSeccionIndex !== -1) {
      this.datosSecciones[datosSeccionIndex].gridInfo = [
        ...this.datosSecciones[datosSeccionIndex].gridInfo,
        ...dataSeccion,
      ];
    }

    console.log(`📌 Sección ${index} - Consulta ejecutada:`, consulta);
    console.log('CAMBIO OFFSET A', seccion.offsetSeccion);
  }

  ngOnDestroy() {
    // Eliminar suscripción cuando el componente se destruya
    if (this.scrollSubscription) {
      this.scrollSubscription.unsubscribe();
    }
    this.seccionesSubscriptions.forEach((sub) => sub.unsubscribe());
  }

  async ngOnInit(): Promise<void> {
    const nombreJson = this.route.snapshot.paramMap.get('nombreJson') || '';
    this.jsonMain = await this.cargarJson(nombreJson);

    this.alternaListadoFormulario = this.jsonMain.alternaListadoFormulario;
    const [camposPorFila, grid] = this.generarEstructura(this.jsonMain);
    this.generarBotonesFormulario(this.jsonMain);
    this.generarBotonesListado(this.jsonMain);

    console.log('this.jsonMain', this.jsonMain);
    this.camposMain = camposPorFila;
    this.gridMain = grid; // Guardar el grid principal
    this.datosGridMain = this.datosTablaMain;
    console.log('campos main', this.camposMain);

    this.mapeoColumnas = this.generarMapeoColumnas();

    let consulta = `SELECT * FROM ${this.jsonMain.tabla}`;

    if (this.jsonMain.groupBy) {
      consulta += ` GROUP BY ${this.jsonMain.groupBy}`;
    }

    if (this.jsonMain.orderBy) {
      consulta += ` ORDER BY ${this.jsonMain.orderBy}`;
    }

    // Agregamos limit y offset con variables
    consulta += ` LIMIT ${this.limit} OFFSET ${this.limit * this.offset};`;

    const dataMain: any = await this.obtenerData(consulta);

    this.datosGridMain = dataMain;
    console.log('datosGridMain', this.datosGridMain);
    this.datosTablaMain = dataMain;

    if (this.jsonMain.alternaListadoFormulario === true) {
      this.mostrarListado = true;
      this.mostrarFormulario = false;
    }
  }

  async alternarListado() {
    if (this.alternaListadoFormulario == true) {
      this.mostrarListado = !this.mostrarListado;
      this.mostrarFormulario = !this.mostrarFormulario;

      // Si se activa el listado, ejecutar la consulta
      if (this.mostrarListado) {
        await this.cargarMasDatos();
        this.ngAfterViewInit();
      }
    }
  }

  generarMapeoColumnas(): any {
    const mapeo: any = {};
    Object.values(this.gridMain).forEach((elemento: any) => {
      if (elemento.titulo && elemento.campoBD) {
        let nombreModificado = elemento.campoBD;

        mapeo[elemento.titulo] = nombreModificado;
      }
    });

    return mapeo;
  }
  generarMapeoSecciones(): any {
    const mapeo: any = {};

    this.datosSecciones.forEach((seccion: any, index: number) => {
      if (Array.isArray(seccion.grid) && seccion.grid.length > 0) {
        seccion.grid.forEach((campo: any) => {
          if (campo && campo.titulo && campo.campoBD) {
            mapeo[campo.titulo] = campo.campoBD;
          }
        });
      }
    });

    return mapeo;
  }
  async seleccionarFila(fila: any) {
    console.log('Fila seleccionada:', fila);
    this.datosSecciones = []; // Limpiar secciones para volver a generarlas

    // Si la fila es null, vaciar el formulario principal
    if (fila === null) {
      Object.values(this.camposMain).forEach((filaCampos: any) => {
        filaCampos.forEach((campo: any) => {
          if (
            campo.fuente?.tipo === 'array' &&
            Array.isArray(campo.fuente.array)
          ) {
            // Buscar si hay un valor por defecto en el array de opciones
            const opcionPorDefecto =
              campo.fuente.array.find((op: any) => op.porDefecto) ||
              campo.fuente.array[0];
            campo.valorDefecto = opcionPorDefecto
              ? opcionPorDefecto.clave
              : null;
          } else {
            campo.valorDefecto = ''; // Limpiar el resto de los campos
          }
        });
      });

      // 🔹 Mantener las secciones pero con el formulario vacío
      if (this.jsonMain.secciones && this.jsonMain.secciones.length > 0) {
        for (let seccion of this.jsonMain.secciones) {
          // Cargar la estructura de la sección sin datos
          const jsonprueba: any = await this.cargarJson(seccion.origen);
          const [camposPorFilaSeccion, gridSeccion] =
            this.generarEstructura(jsonprueba);

          this.datosSecciones.push({
            nombre: seccion.nombre,
            campos: Object.values(camposPorFilaSeccion), // Campos vacíos
            grid: gridSeccion,
            gridInfo: null, // Vaciar los datos de la sección
            acciones: [],
          });
        }
      }

      this.mapeoSecciones = this.generarMapeoSecciones();
      if (this.alternaListadoFormulario == true) {
        this.mostrarListado = false;
        this.mostrarFormulario = true;
      }
      this.cdr.detectChanges();
      return;
    }

    // 🔹 Si fila no es null, llenar los valores normalmente
    Object.values(this.camposMain).forEach(async (filaCampos: any) => {
      filaCampos.forEach((campo: any) => {
        const key = this.mapeoColumnas[campo.titulo];
        let valor = fila[key] || fila[campo.nombre];

        if (valor && typeof valor === 'string' && valor.includes('T')) {
          const fecha = new Date(valor);

          if (campo.tipo === 'date') {
            valor = fecha.toISOString().split('T')[0]; // Formato "YYYY-MM-DD"
          } else if (campo.tipo === 'datetime-local') {
            valor = fecha.toISOString().slice(0, 16); // Formato "YYYY-MM-DDTHH:mm"
          }
        }

        campo.valorDefecto = valor;
      });
    });

    // 🔹 Recargar las secciones con datos si fila es válida
    if (this.jsonMain.secciones && this.jsonMain.secciones.length > 0) {
      for (let seccion of this.jsonMain.secciones) {
        if (!seccion.alternaListadoFormulario) {
          const jsonprueba: any = await this.cargarJson(seccion.origen);
          const [camposPorFilaSeccion, gridSeccion] =
            this.generarEstructura(jsonprueba);

          this.gridSecciones.push(gridSeccion);

          let consulta = `SELECT * FROM ${jsonprueba.tabla}`;
          if (jsonprueba.orderBy) {
            consulta += ` ORDER BY ${jsonprueba.orderBy}`;
          }
          consulta += ` LIMIT ${this.limitSeccion} OFFSET ${
            this.limitSeccion * this.offsetSeccion
          };`;

          let dataSeccion: any = await this.obtenerData(consulta);
          console.log('consulta secciones', consulta);

          let accionesSeccion = [];
          if (jsonprueba.accionesListado) {
            accionesSeccion = jsonprueba.accionesListado
              .filter((accion: any) => accion.tipoGenerico === 'control')
              .map((accion: any) => ({
                nombre: accion.nombre,
                class: accion.class || 'fa fa-button',
                accion: accion.accion || '',
                tipoControl: accion.tipoControl || 'i',
              }));
          }

          this.datosSecciones.push({
            nombre: seccion.nombre,
            campos: Object.values(camposPorFilaSeccion),
            grid: gridSeccion,
            gridInfo: fila ? dataSeccion : null, // Si fila es null, vaciar datos
            acciones: accionesSeccion,
          });
        }
      }
      this.mapeoSecciones = this.generarMapeoSecciones();
    }

    if (fila == null) this.alternarListado();

    this.cdr.detectChanges();
  }

  seleccionarFilaSeccion(fila: any, index: number) {
    this.datosSecciones[index].campos.forEach((filaCampo: any) => {
      filaCampo.forEach((campo: any) => {
        const key = this.mapeoSecciones[campo.titulo];

        let valor = fila[key];

        if (valor && typeof valor === 'string' && valor.includes('T')) {
          const fecha = new Date(valor);
          if (campo.tipo === 'date') {
            valor = fecha.toISOString().split('T')[0]; // Formato "YYYY-MM-DD"
          } else if (campo.tipo === 'datetime-local') {
            valor = fecha.toISOString().slice(0, 16); // Formato "YYYY-MM-DDTHH:mm"
          }
        }

        campo.valorDefecto = valor;
      });
    });

    this.cdr.detectChanges();
  }
  async generarBotonesFormulario(json: any) {
    let opcionesMenu: any[] = [];

    if (
      json?.seccionesBody?.formulario?.construye === true &&
      Array.isArray(json.seccionesBody.formulario.botones)
    ) {
      if (json.seccionesBody.formulario.botones.length === 0) {
        console.log('No existen botones');

        let consultaPermisos = `SELECT * FROM aplicacion_permiso WHERE id_aplicacion = ${json.idAplicacion};`;

        try {
          // Obtener permisos
          const dataPermisos: any = await this.obtenerData(consultaPermisos);
          console.log('Resultado de la primera consulta:', dataPermisos);

          if (dataPermisos.length > 0) {
            const idsPermisos = dataPermisos
              .map((permiso: any) => permiso.id_permiso)
              .join(',');

            let consultaBotones = `SELECT * FROM permiso WHERE id IN (${idsPermisos});`;

            // Obtener botones desde la base de datos
            const dataBotones: any = await this.obtenerData(consultaBotones);
            console.log('Resultado de la segunda consulta:', dataBotones);

            // Si buscar es true, solo mostrar botones 1 y 2, si no, mostrar todos
            const botonesFiltrados = this.buscar
              ? dataBotones.filter(
                  (boton: any) => boton.id === 1 || boton.id === 2
                )
              : dataBotones;

            // Guardar los botones con su id y nombre original
            opcionesMenu = botonesFiltrados.map((boton: any) => ({
              id: boton.id,
              nombre: boton.nombre,
              onClick:
                boton.id === 1
                  ? async (event?: Event) => {
                      if (event) event.stopPropagation();
                      console.log(
                        '🔍 Botón Buscar presionado → Ejecutando consulta'
                      );

                      // ✅ Ejecutar la consulta y obtener los datos
                      await this.realizarConsulta();

                      // ✅ Validar si `datosGridMain` tiene registros
                      if (this.datosGridMain && this.datosGridMain.length > 0) {
                        this.mostrarListado = true; // ✅ Mostrar tabla
                        this.mostrarFormulario = false; // ✅ Asegurar que el formulario esté oculto
                      } else {
                        this.mostrarListado = false; // ❌ Ocultar tabla si no hay datos
                      }

                      this.cdr.detectChanges();
                    }
                  : boton.id === 2
                  ? async (event?: Event) => {
                      if (event) event.stopPropagation();
                      console.log(
                        '📝 Botón Crear presionado → Ejecutando seleccionarFila(null)'
                      );

                      // ✅ Limpia el formulario y secciones
                      this.buscar = false;
                      this.mostrarListado = false;
                      this.mostrarFormulario = true;
                      this.seleccionarFila(null);

                      // ✅ Regenerar los botones en modo "Crear"
                      this.botonesGeneradosFormulario =
                        await this.generarBotonesFormulario(this.jsonMain);
                      this.cdr.detectChanges();
                    }
                  : undefined,
            }));

            this.botonesGeneradosFormulario = opcionesMenu;
            console.log('Botones generados:', this.botonesGeneradosFormulario);
          }
        } catch (error) {
          console.error('Error al obtener los botones:', error);
        }
      } else {
        console.log(
          'Existen botones en JSON:',
          json.seccionesBody.formulario.botones
        );

        let consultaBotones = `SELECT * FROM permiso;`;

        try {
          const dataBotones: any = await this.obtenerData(consultaBotones);
          console.log('Botones obtenidos de la base de datos:', dataBotones);

          // Crear un mapa de botones de la base de datos por ID
          const botonesDB = new Map(
            dataBotones.map((boton: any) => [boton.id.toString(), boton])
          );

          opcionesMenu = json.seccionesBody.formulario.botones
            .map((botonStr: string) => {
              const partes = botonStr.split('|'); // Separar por "|"
              const id = partes[0];

              if (botonesDB.has(id)) {
                const botonDB = botonesDB.get(id) as {
                  id: number;
                  nombre: string;
                };

                return {
                  id: parseInt(id),
                  nombre: partes[1] || botonDB.nombre, // Si no tiene nombre en JSON, usa el de la BD
                  accion:
                    partes[2] ||
                    `console.log('Ejecutando acción para ${botonDB.nombre}');`,
                  onClick:
                    botonDB.id === 1
                      ? async (event?: Event) => {
                          if (event) event.stopPropagation();
                          console.log(
                            'Botón Buscar presionado → Ejecutando realizarConsulta()'
                          );
                          await this.realizarConsulta();

                          // ✅ Mostrar la tabla y ocultar el formulario al buscar
                          this.mostrarListado = true;
                          this.mostrarFormulario = false;
                          this.cdr.detectChanges();
                        }
                      : botonDB.id === 2
                      ? async (event?: Event) => {
                          if (event) event.stopPropagation();
                          console.log(
                            'Botón Crear presionado → Ejecutando seleccionarFila(null)'
                          );

                          // ✅ Limpia el formulario y secciones
                          this.buscar = false;
                          this.mostrarListado = false;
                          this.mostrarFormulario = true;
                          this.seleccionarFila(null);

                          // ✅ Generar nuevamente todos los botones (cuando se presiona "Crear" en modo búsqueda)
                          this.botonesGeneradosFormulario =
                            await this.generarBotonesFormulario(this.jsonMain);
                          this.cdr.detectChanges();
                        }
                      : undefined,
                };
              } else {
                console.warn(
                  `Botón con ID ${id} no encontrado en la base de datos`
                );
                return { id: parseInt(id), nombre: `Opción ${id}` };
              }
            })
            .filter(
              (boton: any) => !this.buscar || boton.id === 1 || boton.id === 2
            ); // ✅ Filtra los botones si buscar es true

          this.botonesGeneradosFormulario = opcionesMenu;
          console.log('Botones generados:', this.botonesGeneradosFormulario);
        } catch (error) {
          console.error('Error al obtener botones:', error);
        }
      }
    }

    return opcionesMenu;
  }

  async generarBotonesListado(json: any) {
    let opcionesMenu: any[] = [];

    if (
      json?.seccionesBody?.listado?.construye === true &&
      Array.isArray(json.seccionesBody.listado.botones)
    ) {
      if (json.seccionesBody.listado.botones.length === 0) {
        console.log(
          'No existen botones en LISTADO. Consultando base de datos...'
        );

        let consultaPermisos = `SELECT * FROM aplicacion_permiso WHERE id_aplicacion = ${json.idAplicacion};`;

        try {
          // 🔹 Obtener permisos
          const dataPermisos: any = await this.obtenerData(consultaPermisos);
          console.log(
            'Resultado de la primera consulta (LISTADO):',
            dataPermisos
          );

          if (dataPermisos.length > 0) {
            const idsPermisos = dataPermisos
              .map((permiso: any) => permiso.id_permiso)
              .join(',');

            let consultaBotones = `SELECT * FROM permiso WHERE id IN (${idsPermisos});`;

            // 🔹 Obtener botones desde la base de datos
            const dataBotones: any = await this.obtenerData(consultaBotones);
            console.log(
              'Resultado de la segunda consulta (LISTADO):',
              dataBotones
            );

            // 🔹 Agregar evento `onClick` a cada botón
            let botonesConEventos = dataBotones.map((boton: any) => ({
              id: boton.id,
              nombre: boton.nombre,
              onClick: (event?: Event) => {
                if (event) event.stopPropagation(); // 🟢 Evita que otro evento se ejecute
                console.log(`Botón presionado: ${boton.nombre}`);
                this.ejecutarAccion(boton.nombre); // Llama la acción correspondiente
              },
            }));

            // 🔹 Buscar botón con `id: 2` (Crear)
            const botonCrear = botonesConEventos.find((b: any) => b.id === 2);

            // 🔹 Crear botón de búsqueda
            // 🔹 Crear botón de búsqueda
            const botonBuscar = {
              id: 99,
              nombre: 'Buscar',
              onClick: async (event?: Event) => {
                if (event) event.stopPropagation();
                console.log('Botón Buscar presionado');

                this.buscar = true; // 🔹 Cambia el estado de búsqueda

                // 🔹 Si jsonMain.alternaListadoFormulario es true, alternamos el formulario
                if (this.jsonMain.alternaListadoFormulario === true) {
                  this.mostrarListado = false;
                  this.mostrarFormulario = true;
                }

                // 🔹 Vaciar todos los valores del formulario principal
                Object.values(this.camposMain).forEach((filaCampos: any) => {
                  filaCampos.forEach((campo: any) => {
                    if (
                      campo.fuente?.tipo === 'array' &&
                      Array.isArray(campo.fuente.array)
                    ) {
                      // ✅ Si es un <ng-select>, restaurar su `valorDefecto`
                      const opcionPorDefecto =
                        campo.fuente.array.find((op: any) => op.porDefecto) ||
                        campo.fuente.array[0];
                      campo.valor = opcionPorDefecto
                        ? opcionPorDefecto.clave
                        : null;
                    } else {
                      // ❌ Para los demás campos, limpiarlos completamente
                      campo.valor = '';
                    }
                  });
                });

                // 🔹 Vaciar también las secciones y resetear su estructura
                this.datosSecciones = [];

                // 🔹 Regenerar la estructura del formulario con campos vacíos
                await this.seleccionarFila(null);

                // 🔹 Regenerar los botones del formulario con la nueva condición
                this.botonesGeneradosFormulario =
                  await this.generarBotonesFormulario(this.jsonMain);

                this.cdr.detectChanges(); // 🔄 Forzar actualización en la vista
              },
            };

            // 🔹 Si existe el botón con ID 2, solo mostrar "Crear" y "Buscar"
            if (botonCrear) {
              botonCrear.onClick = (event?: Event) => {
                if (event) event.stopPropagation();
                console.log(
                  'Botón Crear presionado → Ejecutando seleccionarFila(null)'
                );
                this.seleccionarFila(null);
              };
              opcionesMenu = [botonCrear, botonBuscar];
            } else {
              // 🔹 Si NO existe el botón con ID 2, mostrar todos los botones
              opcionesMenu = [...botonesConEventos, botonBuscar];
            }

            this.botonesGeneradosListado = opcionesMenu;
            console.log(
              'Botones generados en LISTADO:',
              this.botonesGeneradosListado
            );
          }
        } catch (error) {
          console.error('Error al obtener los botones (LISTADO):', error);
        }
      } else {
        console.log('Existen botones en LISTADO. No se realiza consulta.');
      }
    }

    return opcionesMenu;
  }

  generarEstructura(json: any) {
    this.datos = json;
    const camposPorFila: { [key: number]: any[] } = {};
    let grid: any = []; // Grid donde se colocarán los campos

    if (this.datos.campos && this.datos.campos.length > 0) {
      this.datos.campos
        .filter(
          (campo: Campo) =>
            campo.visible === true &&
            (Object.keys(campo.fuente || {}).length === 0 ||
              campo.fuente.tipo !== 'bd')
        )
        .forEach((campo: Campo) => {
          let inputType = 'text';
          let maxLength: number | undefined = undefined;
          let step: string | undefined = undefined;
          let opciones: any[] = [];
          let valorDefecto: string | undefined = undefined;

          // Procesamiento del campo (opciones, valor por defecto, tipo, etc.)
          if (campo.fuente?.tipo === 'array' && campo.fuente.array) {
            opciones = campo.fuente.array.map((option) => ({
              clave: option.clave,
              valor: option.valor,
            }));

            const valorDefectoObj = campo.fuente.array.find(
              (option) => option.defecto
            );
            if (valorDefectoObj) {
              valorDefecto = valorDefectoObj.clave;
            }
          }

          if (campo.tipo?.startsWith('Varchar')) {
            inputType = 'text';
            const match = campo.tipo.match(/\((\d+)\)/);
            if (match) {
              maxLength = parseInt(match[1], 10);
            }
          } else if (campo.tipo === 'text') {
            inputType = 'text';
          } else if (campo.tipo?.startsWith('Numeric')) {
            inputType = 'number';
            step = '1';
          } else if (campo.tipo === 'int') {
            inputType = 'number';
            step = '1';
          } else if (campo.tipo === 'double') {
            inputType = 'number';
            step = '0.01';
          } else if (campo.tipo === 'timestamp') {
            inputType = 'datetime-local';
          } else if (campo.tipo === 'date') {
            inputType = 'date';
          }

          const campoProcesado = {
            titulo: campo.titulo,
            tipo: inputType,
            nombre: campo.nombre,
            campoBD: campo.campoBD,
            maxLength:
              inputType === 'text' || inputType === 'number'
                ? maxLength
                : undefined,
            step: step,
            accion: campo.accion,
            opcionesListado: {
              visible: campo.opcionesListado.visible,
              titulo: campo.opcionesListado.titulo,
              posicion: campo.opcionesListado.posicion,
              longitud: campo.opcionesListado.longitud,
              formato: campo.opcionesListado.formato,
            },
            fuente: {
              tipo: campo.fuente?.tipo,
              array: opciones,
            },
          };

          const fila = campo.posicion || 1;
          if (!camposPorFila[fila]) {
            camposPorFila[fila] = [];
          }
          camposPorFila[fila].push(campoProcesado);
        });

      this.datos.campos.forEach((campo: Campo) => {
        if (
          campo.nombre?.toLowerCase().startsWith('boton') &&
          !campo.titulo &&
          campo.tipoGenerico == 'control'
        ) {
          const botonProcesado = {
            nombre: campo.nombre,
            class: campo.class || 'fa fa-button',
            accion: campo.accion || '',
            tipoControl: campo.tipoControl || 'i',
          };

          const fila = campo.posicion || 1;
          if (!camposPorFila[fila]) {
            camposPorFila[fila] = [];
          }
          camposPorFila[fila].push(botonProcesado);
        }
      });

      // Filtrar los campos con opcionesListado.visible === true
      const camposVisibles: any[] = this.datos.campos
        .filter((listado: Listado) => listado.opcionesListado?.visible)
        .map((campo: any) => ({
          opcionesListado: campo.opcionesListado,
          titulo: campo.titulo,
          nombre: campo.nombre,
          campoBD: campo.campoBD,
        }));

      // Ordenar los campos visibles por su posición
      camposVisibles.sort(
        (a, b) => a.opcionesListado.posicion - b.opcionesListado.posicion
      );

      // Agrupar campos con la misma longitud y mismo título
      const groupedFields = [];
      let currentGroup = null;

      for (let i = 0; i < camposVisibles.length; i++) {
        const campo = camposVisibles[i];
        const longitud = campo.opcionesListado.longitud || 1;
        const titulo = campo.titulo || 'sin título';
        const nombre = campo.nombre;
        const campoBD = campo.campoBD;

        // Si el grupo actual tiene la misma longitud y título, añadir el campo
        if (
          currentGroup &&
          currentGroup.longitud === longitud &&
          currentGroup.titulo === titulo
        ) {
          currentGroup.campos.push(campo);
        } else {
          // Si no, empezar un nuevo grupo con longitud y título específicos
          if (currentGroup) groupedFields.push(currentGroup);
          currentGroup = {
            longitud: longitud,
            titulo: titulo,
            nombre: nombre,
            campoBD: campoBD,
            campos: [campo],
          };
        }
      }
      if (currentGroup) groupedFields.push(currentGroup);

      // Asignamos el grid con los campos agrupados
      grid = groupedFields.map((group) => ({
        titulo: group.titulo,
        nombre: group.nombre,
        campoBD: group.campoBD,
        longitud: group.longitud,
        campos: group.campos,
      }));

      console.log('Grid final:', grid);
    }

    return [camposPorFila, grid];
  }
  obtenerData(consulta: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.obtenerDataService.consultaData(consulta).subscribe({
        next: (data) => {
          resolve(data.data);
        },
        error: (err) => {
          console.error('Error obteniendo documentos de soporte:', err);
          reject(err);
        },
      });
    });
  }

  async cargarJson(nombreJson: string) {
    console.log('nombre json a traer', nombreJson);
    let json = {};
    await fetch(`http://localhost:3000/data/${nombreJson}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`No se pudo cargar el JSON: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        json = data;
        console.log('JSON cargado:', json);
      })
      .catch((error) => console.error('Error al cargar el JSON:', error));

    return json;
  }

  async realizarConsulta() {
    try {
      const cambiosGuardados: { [key: string]: any } = {};

      if (!this.camposMain) {
        console.error('❌ Error: this.camposMain no está definido.');
        return;
      }

      console.log('📌 Verificando camposMain:', this.camposMain);

      const mapeoCampos: { [key: string]: string } = {};

      // 🔹 Crear mapeo de nombres de campos
      for (const fila of Object.values(this.camposMain)) {
        for (const campo of fila) {
          if (campo.nombre && campo.campoBD) {
            mapeoCampos[campo.nombre] = campo.campoBD;
          }
        }
      }

      console.log('🔄 Mapeo de nombres de campos:', mapeoCampos);

      // 🔹 Capturar valores de los campos
      for (const fila of Object.values(this.camposMain)) {
        for (const campo of fila) {
          if (!campo.nombre || !mapeoCampos[campo.nombre]) {
            console.warn(`⚠️ No se encontró campoBD para ${campo.nombre}`);
            continue;
          }

          const nombreBD = mapeoCampos[campo.nombre];
          let valor = '';

          // 🔹 Si es un ng-select, obtenemos el valor desde campo.valorDefecto
          if (campo.fuente?.tipo === 'array') {
            valor = campo.valorDefecto || ''; // ✅ Obtener el valor directamente del modelo
            console.log(`✅ Valor capturado de ng-select: ${valor}`);
          } else {
            // 🔹 Para otros tipos de inputs (input, select)
            const idCampo = `${campo.nombre}_consulta`;
            const elemento = document.getElementById(idCampo) as
              | HTMLInputElement
              | HTMLSelectElement;

            if (!elemento) {
              console.warn(
                `⚠️ No se encontró un input/select con ID: ${idCampo}`
              );
              continue;
            }

            if (
              elemento instanceof HTMLInputElement ||
              elemento instanceof HTMLSelectElement
            ) {
              valor = elemento.value?.trim() || '';
              console.log(`✅ Valor capturado de input/select: ${valor}`);
            }
          }

          // 🔹 Guardar el valor si existe
          if (valor) {
            cambiosGuardados[nombreBD] = valor;
          }
        }
      }

      console.log('📝 Datos capturados:', cambiosGuardados);

      if (Object.keys(cambiosGuardados).length === 0) {
        console.warn('⚠️ No hay datos para consultar.');
        this.mostrarListado = false; // ❌ No mostrar tabla si no hay filtros
        this.datosGridMain = [];
        this.cdr.detectChanges();
        return;
      }

      const condiciones = Object.entries(cambiosGuardados)
        .map(([campoBD, valor]) => `${campoBD} = '${valor}'`)
        .join(' AND ');

      const consulta = `SELECT * FROM ${this.jsonMain.tabla} WHERE ${condiciones};`;

      console.log('🔍 Consulta generada:', consulta);

      const resultado = await this.obtenerData(consulta);

      console.log('📊 Resultado de la consulta:', resultado);

      // ✅ Guardar los resultados en `datosGridMain`
      this.datosGridMain = resultado;

      // ✅ Validar si hay datos antes de mostrar la tabla
      if (!resultado || resultado.length === 0) {
        console.warn('⚠️ No se encontraron registros.');
        this.mostrarListado = false; // ❌ Ocultar tabla si no hay datos

        Swal.fire({
          icon: 'warning',
          title: 'Sin registros',
          confirmButtonText: 'OK',
        });
      } else {
        this.mostrarListado = true; // ✅ Mostrar tabla si hay datos
      }

      this.cdr.detectChanges();
    } catch (error) {
      console.error('❌ Error al realizar la consulta:', error);

      // ✅ Mostrar alerta de error
      Swal.fire({
        icon: 'error',
        title: 'Error en la consulta',
        text: 'Ocurrió un error al procesar la solicitud.',
        confirmButtonText: 'Aceptar',
      });

      this.mostrarListado = false;
      this.datosGridMain = [];
      this.cdr.detectChanges();
    }
  }

  formatearFecha(fecha: string): string {
    const date = new Date(fecha);

    if (isNaN(date.getTime())) {
      return '';
    }

    // Formateamos a 'YYYY-MM-DD HH:MM'
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  decodificarHTML(texto: string): string {
    const txt = document.createElement('textarea');
    txt.innerHTML = texto;
    return txt.value;
  }

  ejecutarAccion(accion: string) {
    console.log('entro a ejecutarAccion con la accion', accion);
    if (!accion) return;

    try {
      // Separar la acción en múltiples comandos si hay ";"
      const comandos = accion
        .split(';')
        .map((cmd) => cmd.trim())
        .filter((cmd) => cmd.length > 0);

      for (const cmd of comandos) {
        const funcMatch = cmd.match(/^([\w]+)\((.*?)\)$/);

        if (funcMatch) {
          const functionName = funcMatch[1];
          const argsString = funcMatch[2];
          const args = argsString
            ? argsString
                .split(',')
                .map((arg) => arg.trim().replace(/^['"](.*)['"]$/, '$1'))
            : [];

          if (typeof (this as any)[functionName] === 'function') {
            console.log(
              `Ejecutando función en this: ${functionName} con argumentos`,
              args
            );
            (this as any)[functionName](...args);
          } else if (typeof (window as any)[functionName] === 'function') {
            console.log(
              `Ejecutando función en window: ${functionName} con argumentos`,
              args
            );
            (window as any)[functionName](...args);
          } else {
            console.error(`Función ${functionName} no encontrada.`);
          }
        } else {
          console.warn(`Comando ignorado: ${cmd} (no es una función válida)`);
        }
      }
    } catch (error) {
      console.error('Error ejecutando la acción:', error);
    }
  }

  guardarEMP(valor: string) {
    console.log(`guardarEMP ejecutado con valor: ${valor}`);
  }
  eliminarEIM(valor: string) {
    console.log('función eliminar EIM');
  }

  eliminarEMP(valor: string) {
    console.log('funcion eliminarEMP');
  }

  calcularValorProductoEgreso() {
    console.log('valorProductoEgrero calculado');
  }
}
