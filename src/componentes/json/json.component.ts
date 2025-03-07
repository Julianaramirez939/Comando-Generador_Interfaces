import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
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
  idFilaSeleccionada: number | null = null;
  idFilaSeleccionadaSeccion: any = null;
  OBJ: any = {};
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
        this.scrollSubscription = fromEvent(
          this.tablaContainer.nativeElement,
          'scroll'
        )
          .pipe(throttleTime(300))
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

    //Scroll para cada sección
    setTimeout(() => {
      if (this.tablasSecciones) {
        this.tablasSecciones.changes.subscribe(() => {
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

    if (seccion.alternaListadoFormulario) return;

    seccion.offsetSeccion = (seccion.offsetSeccion || 0) + 1;

    const jsonSeccion: any = await this.cargarJson(seccion.origen);

    let consulta = `SELECT * FROM ${jsonSeccion.tabla}`;
    if (jsonSeccion.orderBy) {
      consulta += ` ORDER BY ${jsonSeccion.orderBy}`;
    }
    consulta += ` LIMIT ${this.limitSeccion} OFFSET ${
      this.limitSeccion * seccion.offsetSeccion
    };`;

    const dataSeccion: any = await this.obtenerData(consulta);

    //Buscamos la sección dentro de `datosSecciones` y actualizamos `gridInfo`
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

    this.mapeoColumnas = this.generarMapeoColumnas();
    this.verificarFormularioVacio();

    let consulta = `SELECT * FROM ${this.jsonMain.tabla}`;

    if (this.jsonMain.groupBy) {
      consulta += ` GROUP BY ${this.jsonMain.groupBy}`;
    }

    if (this.jsonMain.orderBy) {
      consulta += ` ORDER BY ${this.jsonMain.orderBy}`;
    }

    consulta += ` LIMIT ${this.limit} OFFSET ${this.limit * this.offset};`;

    const dataMain: any = await this.obtenerData(consulta);

    this.datosGridMain = dataMain;

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
    console.log('🔍 Mapeo generado en formulario principal:', mapeo);
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
    console.log('🔍 Mapeo generado en secciones:', mapeo);
    return mapeo;
  }
  async seleccionarFila(fila: any) {
    this.datosSecciones = [];
    console.log('Fila seleccionada:', fila);

    if (!fila) {
      this.idFilaSeleccionada = null;
      console.log('No se ha seleccionado ninguna fila.');

      Object.values(this.camposMain).forEach((filaCampos: any) => {
        filaCampos.forEach((campo: any) => {
          if (
            campo.fuente?.tipo === 'array' &&
            Array.isArray(campo.fuente.array)
          ) {
            const opcionPorDefecto =
              campo.fuente.array.find((op: any) => op.porDefecto) ||
              campo.fuente.array[0];
            campo.valorDefecto = opcionPorDefecto
              ? opcionPorDefecto.clave
              : null;
          } else {
            campo.valorDefecto = '';
          }
        });
      });

      if (this.jsonMain.secciones?.length) {
        for (let seccion of this.jsonMain.secciones) {
          const jsonprueba: any = await this.cargarJson(seccion.origen);
          const [camposPorFilaSeccion, gridSeccion] =
            this.generarEstructura(jsonprueba);

          this.datosSecciones.push({
            nombre: seccion.nombre,
            campos: Object.values(camposPorFilaSeccion),
            grid: gridSeccion,
            gridInfo: null,
            acciones: [],
          });
        }
      }

      this.mapeoSecciones = this.generarMapeoSecciones();
      if (this.alternaListadoFormulario) {
        this.mostrarListado = false;
        this.mostrarFormulario = true;
      }
      this.cdr.detectChanges();
      return;
    }

    this.idFilaSeleccionada = fila.id || fila['id'] || null;
    console.log('✅ ID de la fila seleccionada:', this.idFilaSeleccionada);

    if (!this.idFilaSeleccionada) {
      console.warn('⚠️ La fila seleccionada no tiene un ID válido.');
    }

    Object.values(this.camposMain).forEach((filaCampos: any) => {
      filaCampos.forEach((campo: any) => {
        let campoTransformado = campo.nombre
          .replace(/([a-z])([A-Z])/g, '$1_$2')
          .replace(/_[A-Z]+$/, '')
          .toLowerCase();

        const key = this.mapeoColumnas[campo.titulo] || campoTransformado;

        let valor = fila[key];

        if (valor && typeof valor === 'string' && valor.includes('T')) {
          const fecha = new Date(valor);
          if (campo.tipo === 'date') {
            valor = fecha.toISOString().split('T')[0];
          } else if (campo.tipo === 'datetime-local') {
            valor = fecha.toISOString().slice(0, 16);
          }
        }

        campo.valorDefecto = valor;
      });
    });

    if (this.jsonMain.secciones?.length) {
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
          console.log('🔍 Consulta secciones:', consulta);

          let accionesSeccion = jsonprueba.accionesListado
            ? jsonprueba.accionesListado
                .filter((accion: any) => accion.tipoGenerico === 'control')
                .map((accion: any) => ({
                  nombre: accion.nombre,
                  class: accion.class || 'fa fa-button',
                  accion: accion.accion || '',
                  tipoControl: accion.tipoControl || 'i',
                }))
            : [];

          this.datosSecciones.push({
            nombre: seccion.nombre,
            campos: Object.values(camposPorFilaSeccion),
            grid: gridSeccion,
            gridInfo: dataSeccion || null,
            acciones: accionesSeccion,
          });
        }
      }
      this.mapeoSecciones = this.generarMapeoSecciones();
    }

    this.buscar = false;
    if (!fila) this.alternarListado();
    this.cdr.detectChanges();
  }

  seleccionarFilaSeccion(fila: any, index: number) {
    console.log('✅ Fila seleccionada:', fila, 'en la sección:', index);

    if (fila.id !== undefined) {
      this.idFilaSeleccionadaSeccion = fila.id;
      console.log(
        '🆔 ID de la fila seleccionada:',
        this.idFilaSeleccionadaSeccion
      );
    } else {
      console.warn('⚠️ La fila seleccionada no tiene un campo "id".');
      this.idFilaSeleccionadaSeccion = null;
    }

    this.datosSecciones[index].campos.forEach((filaCampo: any) => {
      filaCampo.forEach((campo: any) => {
        let campoTransformado = campo.nombre
          .replace(/([a-z])([A-Z])/g, '$1_$2')
          .replace(/_[A-Z]+$/, '')
          .toLowerCase();

        const key = this.mapeoSecciones[campo.titulo] || campoTransformado;

        let valor = fila[key];

        if (valor && typeof valor === 'string' && valor.includes('T')) {
          const fecha = new Date(valor);
          if (campo.tipo === 'date') {
            valor = fecha.toISOString().split('T')[0];
          } else if (campo.tipo === 'datetime-local') {
            valor = fecha.toISOString().slice(0, 16);
          }
        }

        campo.valorDefecto = valor;
      });
    });

    this.cdr.detectChanges();
  }

  async generarBotonesFormulario(json: any) {
    let opcionesMenu: any[] = [];

    this.botonesGeneradosFormulario = [];

    if (
      json?.seccionesBody?.formulario?.construye === true &&
      Array.isArray(json.seccionesBody.formulario.botones)
    ) {
      if (json.seccionesBody.formulario.botones.length === 0) {
        let consultaPermisos = `SELECT * FROM aplicacion_permiso WHERE id_aplicacion = ${json.idAplicacion};`;

        try {
          const dataPermisos: any = await this.obtenerData(consultaPermisos);
          console.log(
            'Resultado de la primera consulta (FORMULARIO):',
            dataPermisos
          );

          if (dataPermisos.length > 0) {
            const idsPermisos = dataPermisos
              .map((permiso: any) => permiso.id_permiso)
              .join(',');
            let consultaBotones = `SELECT * FROM permiso WHERE id IN (${idsPermisos});`;

            const dataBotones: any = await this.obtenerData(consultaBotones);
            console.log(
              'Resultado de la segunda consulta (FORMULARIO):',
              dataBotones
            );

            let botonesFiltrados;
            if (this.buscar) {
              botonesFiltrados = dataBotones.filter(
                (boton: any) => boton.id === 1 || boton.id === 2
              );
            } else {
              botonesFiltrados = dataBotones.filter(
                (boton: any) => boton.id !== 1
              );
            }

            opcionesMenu = botonesFiltrados.map((boton: any) => ({
              id: boton.id,
              nombre: boton.id === 2 ? 'Nuevo' : boton.nombre,
              onClick: async (event?: Event) => {
                if (event) event.stopPropagation();

                if (boton.id === 1) {
                  // Botón "Consultar"
                  await this.realizarConsulta();

                  if (!this.datosGridMain || this.datosGridMain.length === 0) {
                    console.log(
                      '⚠️ No se encontraron registros. Manteniendo la vista actual.'
                    );
                    return;
                  }

                  this.mostrarListado = true;
                  this.mostrarFormulario = false;
                  this.buscar = false;

                  this.botonesGeneradosFormulario =
                    await this.generarBotonesFormulario(this.jsonMain);
                  this.cdr.detectChanges();
                } else if (boton.id === 2) {
                  // Botón "Nuevo"
                  this.buscar = false;
                  this.mostrarListado = false;
                  this.mostrarFormulario = true;

                  this.datosSecciones = [];
                  await this.seleccionarFila(null);

                  this.botonesGeneradosFormulario =
                    await this.generarBotonesFormulario(this.jsonMain);
                  this.cdr.detectChanges();
                } else if (boton.id === 3) {
                  // Botón "Modificar"

                  await this.modificarFormulario();

                  Swal.fire({
                    icon: 'success',
                    title: 'Formulario Modificado',
                    text: 'Los cambios han sido guardados exitosamente.',
                    confirmButtonText: 'OK',
                  });

                  this.cdr.detectChanges();
                }
              },
            }));

            this.botonesGeneradosFormulario = opcionesMenu;
            console.log(
              '✅ Botones generados en FORMULARIO:',
              this.botonesGeneradosFormulario
            );
          }
        } catch (error) {
          console.error(' Error al obtener los botones (FORMULARIO):', error);
        }
      } else {
        console.log('Existen botones en FORMULARIO. No se realiza consulta.');
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
        let consultaPermisos = `SELECT * FROM aplicacion_permiso WHERE id_aplicacion = ${json.idAplicacion};`;

        try {
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

            const dataBotones: any = await this.obtenerData(consultaBotones);
            console.log(
              'Resultado de la segunda consulta (LISTADO):',
              dataBotones
            );

            let botonesConEventos = dataBotones.map((boton: any) => ({
              id: boton.id,
              nombre: boton.id === 2 ? 'Nuevo' : boton.nombre,
              onClick: (event?: Event) => {
                if (event) event.stopPropagation();
                console.log(`Botón presionado: ${boton.nombre}`);
                this.ejecutarAccion(boton.nombre);
              },
            }));

            const botonCrear = botonesConEventos.find((b: any) => b.id === 2);

            const botonBuscar = {
              id: 99,
              nombre: 'Buscar',
              onClick: async (event?: Event) => {
                if (event) event.stopPropagation();

                this.buscar = true;

                if (this.jsonMain.alternaListadoFormulario === true) {
                  this.mostrarListado = false;
                  this.mostrarFormulario = true;
                }

                Object.values(this.camposMain).forEach((filaCampos: any) => {
                  filaCampos.forEach((campo: any) => {
                    if (
                      campo.fuente?.tipo === 'array' &&
                      Array.isArray(campo.fuente.array)
                    ) {
                      const opcionPorDefecto =
                        campo.fuente.array.find((op: any) => op.porDefecto) ||
                        campo.fuente.array[0];
                      campo.valor = opcionPorDefecto
                        ? opcionPorDefecto.clave
                        : null;
                    } else {
                      campo.valor = '';
                    }
                  });
                });

                this.datosSecciones = [];
                await this.seleccionarFila(null);
                this.botonesGeneradosFormulario =
                  await this.generarBotonesFormulario(this.jsonMain);

                this.cdr.detectChanges();
              },
            };

            if (botonCrear) {
              botonCrear.onClick = async (event?: Event) => {
                if (event) event.stopPropagation();

                this.buscar = false;
                this.mostrarListado = false;
                this.mostrarFormulario = true;

                this.datosSecciones = [];
                await this.seleccionarFila(null);

                this.botonesGeneradosFormulario =
                  await this.generarBotonesFormulario(this.jsonMain);

                this.cdr.detectChanges();
              };

              opcionesMenu = [botonCrear, botonBuscar];
            } else {
              opcionesMenu = [...botonesConEventos, botonBuscar];
            }

            this.botonesGeneradosListado = opcionesMenu;
            console.log(
              '✅ Botones generados en LISTADO:',
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
            Object.keys(campo.fuente || {}).length === 0 ||
            campo.fuente.tipo !== 'bd'
        )
        .forEach((campo: Campo) => {
          let inputType = 'text';
          let maxLength: number | undefined = undefined;
          let step: string | undefined = undefined;
          let opciones: any[] = [];
          let valorDefecto: string | undefined = undefined;

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
            visible: campo.visible,
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
            visible: campo.visible,
          };
          console.log('botonProcesado', botonProcesado);

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

      // 🔹 Crear mapeo de nombres de campos, solo si son visibles
      for (const fila of Object.values(this.camposMain)) {
        for (const campo of fila) {
          if (campo.visible && campo.nombre && campo.campoBD) {
            mapeoCampos[campo.nombre] = campo.campoBD;
          }
        }
      }

      console.log(
        '🔄 Mapeo de nombres de campos (solo visibles):',
        mapeoCampos
      );

      // 🔹 Capturar valores de los campos visibles
      for (const fila of Object.values(this.camposMain)) {
        for (const campo of fila) {
          if (!campo.visible || !campo.nombre || !mapeoCampos[campo.nombre]) {
            continue; // ❌ Saltar campos no visibles
          }

          const nombreBD = mapeoCampos[campo.nombre];
          let valor = '';

          // 🔹 Si es un ng-select, obtener el valor desde campo.valorDefecto
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

      console.log('📝 Datos capturados (solo visibles):', cambiosGuardados);

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
// <------------- Función que ejecuta el boton modificar del formulario y el del listado------------->
  async modificarFormulario() {
    try {
      const cambiosGuardados: { [key: string]: any } = {};

      if (!this.camposMain) {
        console.error('❌ Error: this.camposMain no está definido.');
        return;
      }

      if (this.idFilaSeleccionada === null) {
        console.error('❌ Error: No hay fila seleccionada para modificar.');
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Debe seleccionar una fila antes de modificar.',
          confirmButtonText: 'OK',
        });
        return;
      }

      console.log('📌 ID de la fila a modificar:', this.idFilaSeleccionada);
      console.log('📌 Verificando camposMain:', this.camposMain);

      const mapeoCampos: { [key: string]: string } = {};

      // 🔹 Crear mapeo solo con los campos visibles
      for (const fila of Object.values(this.camposMain)) {
        for (const campo of fila) {
          if (campo.visible && campo.nombre && campo.campoBD) {
            mapeoCampos[campo.nombre] = campo.campoBD;
          }
        }
      }

      console.log(
        '🔄 Mapeo de nombres de campos (solo visibles):',
        mapeoCampos
      );

      // 🔹 Capturar valores de los campos visibles
      for (const fila of Object.values(this.camposMain)) {
        for (const campo of fila) {
          if (!campo.visible || !campo.nombre || !mapeoCampos[campo.nombre]) {
            continue;
          }

          const nombreBD = mapeoCampos[campo.nombre];
          let valor = '';

          // 🔹 Si es un ng-select, obtener el valor desde campo.valorDefecto
          if (campo.fuente?.tipo === 'array') {
            valor = campo.valorDefecto || '';
            console.log(
              `✅ Valor capturado de ng-select (${nombreBD}): ${valor}`
            );
          } else {
            // 🔹 Buscar input con ID normal o con "_consulta"
            const elemento =
              document.getElementById(campo.nombre) ||
              document.getElementById(`${campo.nombre}_consulta`);

            if (!elemento) {
              console.warn(
                `⚠️ No se encontró un input/select con ID: ${campo.nombre} o ${campo.nombre}_consulta`
              );
              continue;
            }

            if (
              elemento instanceof HTMLInputElement ||
              elemento instanceof HTMLSelectElement
            ) {
              valor = elemento.value?.trim() || '';
              console.log(
                `✅ Valor capturado de input/select (${nombreBD}): ${valor}`
              );
            }
          }

          // 🔹 Guardar solo los valores que realmente cambiaron
          if (valor) {
            cambiosGuardados[nombreBD] = valor;
          }
        }
      }

      console.log('📝 Datos capturados para modificación:', cambiosGuardados);

      if (Object.keys(cambiosGuardados).length === 0) {
        console.warn('⚠️ No hay datos para modificar.');
        Swal.fire({
          icon: 'warning',
          title: 'Sin cambios',
          text: 'No se detectaron modificaciones en el formulario.',
          confirmButtonText: 'OK',
        });
        return;
      }

      // 🔹 Generar la consulta de actualización
      const actualizaciones = Object.entries(cambiosGuardados)
        .map(([campoBD, valor]) => `${campoBD} = '${valor}'`)
        .join(', ');

      const consulta = `UPDATE ${this.jsonMain.tabla} SET ${actualizaciones} WHERE id = '${this.idFilaSeleccionada}';`;

      console.log('✏️ Consulta de actualización generada:', consulta);

      // 🔹 Ejecutar la consulta
      const resultado = await this.obtenerData(consulta);

      Swal.fire({
        icon: 'success',
        title: 'Modificación exitosa',
        text: 'El formulario se ha actualizado correctamente.',
        confirmButtonText: 'OK',
      });

      this.cdr.detectChanges();
    } catch (error) {
      console.error('❌ Error al modificar el formulario:', error);

      Swal.fire({
        icon: 'error',
        title: 'Error en la modificación',
        text: 'Ocurrió un error al actualizar el formulario.',
        confirmButtonText: 'Aceptar',
      });

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
  }

  // <------------- Funciones para ejecutar botones guardar y eliminar de las secciones ------------->
  accionSeccionEliminar(accion: string, OBJ: any, index: number) {
    console.log(
      '➡️ EjecutarAccion con:',
      accion,
      'objeto:',
      OBJ,
      'índice:',
      index
    );

    if (!accion) return;

    try {
      const comandos = accion
        .split(';')
        .map((cmd) => cmd.trim())
        .filter((cmd) => cmd.length > 0);

      for (const cmd of comandos) {
        const funcMatch = cmd.match(/^([\w]+)\((.*?)\)$/);
        let functionName: string;
        let args: any[] = [];

        if (funcMatch) {
          // Caso: función con paréntesis (ej: "miFuncion(1,2)")
          functionName = funcMatch[1];
          const argsString = funcMatch[2];
          args = argsString
            ? argsString
                .split(',')
                .map((arg) => arg.trim().replace(/^['"](.*)['"]$/, '$1'))
            : [];
        } else {
          // Caso: función sin paréntesis (ej: "eliminarEITM")
          functionName = cmd;
        }

        console.log(
          `🔹 Ejecutando función ${functionName} con índice`,
          index,
          'y objeto:',
          OBJ
        );

        if (typeof (this as any)[functionName] === 'function') {
          (this as any)[functionName](index, ...args); // Llamar función con índice
        } else if (typeof (window as any)[functionName] === 'function') {
          (window as any)[functionName](index, ...args);
        } else {
          console.error(`❌ Función ${functionName} no encontrada.`);
        }
      }
    } catch (error) {
      console.error('❌ Error ejecutando la acción:', error);
    }
  }
  accionSeccionGuardar(accion: string, OBJ: any, index: number) {
    console.log(
      '➡️ EjecutarAccion con:',
      accion,
      'objeto:',
      OBJ,
      'índice:',
      index
    );

    if (!accion) return;

    try {
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

          console.log(
            `🔹 Ejecutando función ${functionName} con índice`,
            index,
            'y objeto:',
            OBJ
          );

          // Asegurar que la función existe en el contexto actual
          if (typeof (this as any)[functionName] === 'function') {
            (this as any)[functionName](OBJ, index, ...args);
          } else if (typeof (window as any)[functionName] === 'function') {
            (window as any)[functionName](OBJ, index, ...args);
          } else if (typeof (this as any)[accion] === 'function') {
            // ✅ Nueva lógica: Si el nombre de la acción coincide con una función, ejecutarla
            console.log(
              `🔹 Ejecutando función ${accion} con objeto:`,
              OBJ,
              'y índice:',
              index
            );
            (this as any)[accion](OBJ, index);
          } else {
            console.error(`❌ Función ${functionName} no encontrada.`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error ejecutando la acción:', error);
    }
  }
  verificarFormularioVacio() {
    let todosCamposVacios = true;

    this.datosSecciones.forEach((seccion) => {
      seccion.campos.forEach((filaCampos: any) => {
        filaCampos.forEach((campo: any) => {
          if (
            campo.visible &&
            !campo.nombre.toLowerCase().startsWith('boton')
          ) {
            let valor = campo.valorDefecto || '';
            if (valor.trim() !== '') {
              todosCamposVacios = false;
            }
          }
        });
      });
    });

    if (todosCamposVacios) {
      console.warn(
        '⚠️ Todos los campos fueron vaciados manualmente. Se reseteará la selección.'
      );
      this.idFilaSeleccionadaSeccion = null; // 🔥 Deseleccionar la fila automáticamente
    }
  }
  // <------------- Funciones para botones guardar de las secciones ------------->
  async guardarEMP(OBJ: any, index: number) {
    try {
      console.log('📌 Objeto recibido en guardarEMP:', OBJ);

      let seccion = this.datosSecciones[index];

      if (this.jsonMain.secciones?.length) {
        for (let sec of this.jsonMain.secciones) {
          if (sec.nombre === seccion.nombre) {
            seccion.origen = sec.origen;
            break;
          }
        }
      }

      if (!seccion) {
        console.error('❌ No se encontró la sección activa.');
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se encontró la sección activa para guardar los datos.',
        });
        return;
      }

      const jsonSeccion: any = await this.cargarJson(seccion.origen);
      console.log('📥 JSON de la sección cargado:', jsonSeccion);

      if (!jsonSeccion || !jsonSeccion.tabla) {
        console.error(
          '❌ No se pudo obtener la configuración de la sección.',
          jsonSeccion
        );
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo obtener la configuración de la sección.',
        });
        return;
      }

      let cambiosGuardados: { [key: string]: any } = {};
      let idSeccion: number | null = this.idFilaSeleccionadaSeccion;
      let campoIdPadre = '';

      if (!idSeccion) {
        console.warn('⚠️ No hay fila seleccionada, se realizará un INSERT.');

        if (!jsonSeccion.tablaPadre) {
          console.error('❌ No se encontró tablaPadre en el JSON.');
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se encontró tablaPadre en la configuración.',
          });
          return;
        }

        let tablaPadreCamel = jsonSeccion.tablaPadre.replace(
          /_([a-z])/g,
          (_: string, letra: string) => letra.toUpperCase()
        );
        console.log(
          `📝 Tabla padre convertida a camelCase: ${tablaPadreCamel}`
        );

        const jsonPadre: any = await this.cargarJson(tablaPadreCamel);
        console.log('📥 JSON de la tabla padre cargado:', jsonPadre);

        if (!jsonPadre || !jsonPadre.secciones) {
          console.error(
            '❌ No se encontró la sección en el JSON padre.',
            jsonPadre
          );
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se encontró la configuración de la tabla padre.',
          });
          return;
        }

        let sufijo = jsonSeccion.sufijo;
        console.log(`🔎 Buscando sección con sufijo: ${sufijo}`);

        let seccionPadre = jsonPadre.secciones.find(
          (sec: any) => sec.nombre === sufijo
        );

        if (!seccionPadre) {
          console.error(
            `❌ No se encontró una sección en la tabla padre con sufijo: ${sufijo}`
          );
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `No se encontró una sección en la tabla padre con el sufijo: ${sufijo}`,
          });
          return;
        }

        campoIdPadre = seccionPadre.campoIdPadre;
        if (!campoIdPadre) {
          console.error('❌ No se encontró campoIdPadre en la sección padre.');
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se encontró campoIdPadre en la tabla padre.',
          });
          return;
        }

        console.log(`🔑 Campo ID Padre obtenido: ${campoIdPadre}`);
      }

      seccion.campos.forEach((filaCampos: any) => {
        filaCampos.forEach((campo: any) => {
          if (
            campo.visible &&
            !campo.nombre.toLowerCase().startsWith('boton')
          ) {
            let campoTransformado = campo.nombre
              .replace(/([a-z])([A-Z])/g, '$1_$2')
              .replace(/_[A-Z]+$/, '')
              .toLowerCase();
            const key = this.mapeoSecciones[campo.titulo] || campoTransformado;
            console.log(
              `🔑 Campo "${campo.titulo || campoTransformado}" mapeado como:`,
              key
            );

            let valor = campo.valorDefecto || '';

            if (campo.tipo === 'date' && valor) {
              valor = new Date(valor).toISOString().split('T')[0];
            } else if (campo.tipo === 'datetime-local' && valor) {
              valor = new Date(valor).toISOString().slice(0, 16);
            }

            if (key !== 'id') {
              cambiosGuardados[key] = valor;
            }
          }
        });
      });

      console.log('📤 Datos a guardar:', cambiosGuardados);

      if (Object.keys(cambiosGuardados).length === 0) {
        console.warn('⚠️ No hay cambios para guardar.');
        Swal.fire({
          icon: 'warning',
          title: 'Sin cambios',
          text: 'No se detectaron modificaciones en la sección.',
        });
        return;
      }

      try {
        let consulta = '';

        if (!idSeccion) {
          cambiosGuardados[campoIdPadre] = this.idFilaSeleccionada;
          const campos = Object.keys(cambiosGuardados).join(', ');
          const valores = Object.values(cambiosGuardados)
            .map((valor) => `'${valor}'`)
            .join(', ');
          consulta = `INSERT INTO ${jsonSeccion.tabla} (${campos}) VALUES (${valores});`;
        } else {
          const setQuery = Object.entries(cambiosGuardados)
            .map(([campoBD, valor]) => `${campoBD} = '${valor}'`)
            .join(', ');
          consulta = `UPDATE ${jsonSeccion.tabla} SET ${setQuery} WHERE id = ${idSeccion};`;
        }

        console.log('📜 Ejecutando consulta SQL:', consulta);
        const resultado = await this.obtenerData(consulta);
        console.log('✅ Resultado de la consulta:', resultado);

        Swal.fire({
          icon: 'success',
          title: 'Guardado exitoso',
          text: 'Los cambios en la sección han sido guardados correctamente.',
        });

        this.idFilaSeleccionadaSeccion = null;
        this.datosSecciones.forEach((seccion) => {
          seccion.campos.forEach((filaCampos: any) => {
            filaCampos.forEach((campo: any) => {
              if (campo.visible) {
                campo.valorDefecto = '';
              }
            });
          });
        });

        this.cdr.detectChanges();
      } catch (error: any) {
        console.error('❌ Error en obtenerData():', error);
        Swal.fire({
          icon: 'error',
          title: 'Error en la base de datos',
          text: `No se pudo guardar la sección: ${error.message}`,
        });
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('❌ Error inesperado en guardarEMP:', error);
    }
  }

  async guardarEITM(OBJ: any, index: number) {
    try {
      console.log('📌 Objeto recibido en guardarEMP:', OBJ);

      let seccion = this.datosSecciones[index];

      if (this.jsonMain.secciones?.length) {
        for (let sec of this.jsonMain.secciones) {
          if (sec.nombre === seccion.nombre) {
            seccion.origen = sec.origen;
            break;
          }
        }
      }

      if (!seccion) {
        console.error('❌ No se encontró la sección activa.');
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se encontró la sección activa para guardar los datos.',
        });
        return;
      }

      const jsonSeccion: any = await this.cargarJson(seccion.origen);
      console.log('📥 JSON de la sección cargado:', jsonSeccion);

      if (!jsonSeccion || !jsonSeccion.tabla) {
        console.error(
          '❌ No se pudo obtener la configuración de la sección.',
          jsonSeccion
        );
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo obtener la configuración de la sección.',
        });
        return;
      }

      let cambiosGuardados: { [key: string]: any } = {};
      let idSeccion: number | null = this.idFilaSeleccionadaSeccion;
      let campoIdPadre = '';

      if (!idSeccion) {
        console.warn('⚠️ No hay fila seleccionada, se realizará un INSERT.');

        if (!jsonSeccion.tablaPadre) {
          console.error('❌ No se encontró tablaPadre en el JSON.');
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se encontró tablaPadre en la configuración.',
          });
          return;
        }

        let tablaPadreCamel = jsonSeccion.tablaPadre.replace(
          /_([a-z])/g,
          (_: string, letra: string) => letra.toUpperCase()
        );
        console.log(
          `📝 Tabla padre convertida a camelCase: ${tablaPadreCamel}`
        );

        const jsonPadre: any = await this.cargarJson(tablaPadreCamel);
        console.log('📥 JSON de la tabla padre cargado:', jsonPadre);

        if (!jsonPadre || !jsonPadre.secciones) {
          console.error(
            '❌ No se encontró la sección en el JSON padre.',
            jsonPadre
          );
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se encontró la configuración de la tabla padre.',
          });
          return;
        }

        let sufijo = jsonSeccion.sufijo;
        console.log(`🔎 Buscando sección con sufijo: ${sufijo}`);

        let seccionPadre = jsonPadre.secciones.find(
          (sec: any) => sec.nombre === sufijo
        );

        if (!seccionPadre) {
          console.error(
            `❌ No se encontró una sección en la tabla padre con sufijo: ${sufijo}`
          );
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `No se encontró una sección en la tabla padre con el sufijo: ${sufijo}`,
          });
          return;
        }

        campoIdPadre = seccionPadre.campoIdPadre;
        if (!campoIdPadre) {
          console.error('❌ No se encontró campoIdPadre en la sección padre.');
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se encontró campoIdPadre en la tabla padre.',
          });
          return;
        }

        console.log(`🔑 Campo ID Padre obtenido: ${campoIdPadre}`);
      }

      seccion.campos.forEach((filaCampos: any) => {
        filaCampos.forEach((campo: any) => {
          if (
            campo.visible &&
            !campo.nombre.toLowerCase().startsWith('boton')
          ) {
            let campoTransformado = campo.nombre
              .replace(/([a-z])([A-Z])/g, '$1_$2')
              .replace(/_[A-Z]+$/, '')
              .toLowerCase();
            const key = this.mapeoSecciones[campo.titulo] || campoTransformado;
            console.log(
              `🔑 Campo "${campo.titulo || campoTransformado}" mapeado como:`,
              key
            );

            let valor = campo.valorDefecto || '';

            if (campo.tipo === 'date' && valor) {
              valor = new Date(valor).toISOString().split('T')[0];
            } else if (campo.tipo === 'datetime-local' && valor) {
              valor = new Date(valor).toISOString().slice(0, 16);
            }

            if (key !== 'id') {
              cambiosGuardados[key] = valor;
            }
          }
        });
      });

      console.log('📤 Datos a guardar:', cambiosGuardados);

      if (Object.keys(cambiosGuardados).length === 0) {
        console.warn('⚠️ No hay cambios para guardar.');
        Swal.fire({
          icon: 'warning',
          title: 'Sin cambios',
          text: 'No se detectaron modificaciones en la sección.',
        });
        return;
      }

      try {
        let consulta = '';

        if (!idSeccion) {
          cambiosGuardados[campoIdPadre] = this.idFilaSeleccionada;
          const campos = Object.keys(cambiosGuardados).join(', ');
          const valores = Object.values(cambiosGuardados)
            .map((valor) => `'${valor}'`)
            .join(', ');
          consulta = `INSERT INTO ${jsonSeccion.tabla} (${campos}) VALUES (${valores});`;
        } else {
          const setQuery = Object.entries(cambiosGuardados)
            .map(([campoBD, valor]) => `${campoBD} = '${valor}'`)
            .join(', ');
          consulta = `UPDATE ${jsonSeccion.tabla} SET ${setQuery} WHERE id = ${idSeccion};`;
        }

        console.log('📜 Ejecutando consulta SQL:', consulta);
        const resultado = await this.obtenerData(consulta);
        console.log('✅ Resultado de la consulta:', resultado);

        Swal.fire({
          icon: 'success',
          title: 'Guardado exitoso',
          text: 'Los cambios en la sección han sido guardados correctamente.',
        });

        this.idFilaSeleccionadaSeccion = null;
        this.datosSecciones.forEach((seccion) => {
          seccion.campos.forEach((filaCampos: any) => {
            filaCampos.forEach((campo: any) => {
              if (campo.visible) {
                campo.valorDefecto = '';
              }
            });
          });
        });

        this.cdr.detectChanges();
      } catch (error: any) {
        console.error('❌ Error en obtenerData():', error);
        Swal.fire({
          icon: 'error',
          title: 'Error en la base de datos',
          text: `No se pudo guardar la sección: ${error.message}`,
        });
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('❌ Error inesperado en guardarEMP:', error);
    }
  }
  // <------------- Funciones para botones eliminar de las secciones ------------->
  async eliminarEITM(index: number) {
    try {
      console.log(
        '🗑️ Intentando eliminar fila en la sección con índice:',
        index
      );

      let seccion = this.datosSecciones[index];

      // 🔹 Buscar la sección en jsonMain para obtener el origen correcto
      if (this.jsonMain.secciones?.length) {
        for (let sec of this.jsonMain.secciones) {
          if (sec.nombre === seccion.nombre) {
            seccion.origen = sec.origen;
            break;
          }
        }
      }

      if (!seccion) {
        console.error('❌ No se encontró la sección activa.');
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se encontró la sección activa para eliminar la fila.',
        });
        return;
      }

      if (!this.idFilaSeleccionadaSeccion) {
        console.warn('⚠️ No hay una fila seleccionada para eliminar.');
        Swal.fire({
          icon: 'warning',
          title: 'Atención',
          text: 'Debe seleccionar una fila antes de eliminar.',
        });
        return;
      }

      // 🔹 Cargar JSON de la sección después de obtener la información del `jsonMain`
      const jsonSeccion: any = await this.cargarJson(seccion.origen);
      console.log('📥 JSON de la sección cargado:', jsonSeccion);

      if (!jsonSeccion || !jsonSeccion.tabla) {
        console.error('❌ No se pudo obtener la configuración de la sección.');
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo obtener la configuración de la sección.',
        });
        return;
      }

      // 🔥 Confirmación antes de eliminar
      Swal.fire({
        title: '¿Estás seguro?',
        text: 'Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            console.log(
              '🗑️ Eliminando fila con ID:',
              this.idFilaSeleccionadaSeccion
            );

            // 🔹 Generar consulta SQL para eliminar
            const consulta = `DELETE FROM ${jsonSeccion.tabla} WHERE id = ${this.idFilaSeleccionadaSeccion};`;
            console.log('📜 Ejecutando consulta:', consulta);

            await this.obtenerData(consulta);
            console.log('✅ Fila eliminada correctamente');

            Swal.fire({
              icon: 'success',
              title: 'Eliminado',
              text: 'La fila ha sido eliminada correctamente.',
            });

            // 🔹 Actualizar la UI eliminando la fila de `gridInfo`
            seccion.gridInfo = seccion.gridInfo.filter(
              (fila: any) => fila.id !== this.idFilaSeleccionadaSeccion
            );
          } catch (error) {
            console.error('❌ Error al eliminar la fila:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo eliminar la fila. Inténtalo de nuevo.',
            });
          }
        }

        // 🔹 Limpiar selección y campos (ya sea por eliminación exitosa o cancelación)
        this.idFilaSeleccionadaSeccion = null;
        seccion.campos.forEach((filaCampos: any) => {
          filaCampos.forEach((campo: any) => {
            if (campo.visible) {
              campo.valorDefecto = '';
            }
          });
        });

        this.cdr.detectChanges();
      });
    } catch (error) {
      console.error('❌ Error inesperado en eliminarEITM:', error);
    }
  }

  async eliminarEMP(index: number) {
    try {
      console.log(
        '🗑️ Intentando eliminar fila en la sección con índice:',
        index
      );

      let seccion = this.datosSecciones[index];

      // 🔹 Buscar la sección en jsonMain para obtener el origen correcto
      if (this.jsonMain.secciones?.length) {
        for (let sec of this.jsonMain.secciones) {
          if (sec.nombre === seccion.nombre) {
            seccion.origen = sec.origen;
            break;
          }
        }
      }

      if (!seccion) {
        console.error('❌ No se encontró la sección activa.');
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se encontró la sección activa para eliminar la fila.',
        });
        return;
      }

      if (!this.idFilaSeleccionadaSeccion) {
        console.warn('⚠️ No hay una fila seleccionada para eliminar.');
        Swal.fire({
          icon: 'warning',
          title: 'Atención',
          text: 'Debe seleccionar una fila antes de eliminar.',
        });
        return;
      }

      // 🔹 Cargar JSON de la sección después de obtener la información del `jsonMain`
      const jsonSeccion: any = await this.cargarJson(seccion.origen);
      console.log('📥 JSON de la sección cargado:', jsonSeccion);

      if (!jsonSeccion || !jsonSeccion.tabla) {
        console.error('❌ No se pudo obtener la configuración de la sección.');
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo obtener la configuración de la sección.',
        });
        return;
      }

      // 🔥 Confirmación antes de eliminar
      Swal.fire({
        title: '¿Estás seguro?',
        text: 'Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            console.log(
              '🗑️ Eliminando fila con ID:',
              this.idFilaSeleccionadaSeccion
            );

            // 🔹 Generar consulta SQL para eliminar
            const consulta = `DELETE FROM ${jsonSeccion.tabla} WHERE id = ${this.idFilaSeleccionadaSeccion};`;
            console.log('📜 Ejecutando consulta:', consulta);

            await this.obtenerData(consulta);
            console.log('✅ Fila eliminada correctamente');

            Swal.fire({
              icon: 'success',
              title: 'Eliminado',
              text: 'La fila ha sido eliminada correctamente.',
            });

            // 🔹 Actualizar la UI eliminando la fila de `gridInfo`
            seccion.gridInfo = seccion.gridInfo.filter(
              (fila: any) => fila.id !== this.idFilaSeleccionadaSeccion
            );
          } catch (error) {
            console.error('❌ Error al eliminar la fila:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo eliminar la fila. Inténtalo de nuevo.',
            });
          }
        }

        // 🔹 Limpiar selección y campos (ya sea por eliminación exitosa o cancelación)
        this.idFilaSeleccionadaSeccion = null;
        seccion.campos.forEach((filaCampos: any) => {
          filaCampos.forEach((campo: any) => {
            if (campo.visible) {
              campo.valorDefecto = '';
            }
          });
        });

        this.cdr.detectChanges();
      });
    } catch (error) {
      console.error('❌ Error inesperado en eliminarEITM:', error);
    }
  }
}
