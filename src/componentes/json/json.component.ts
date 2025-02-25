import { CommonModule } from '@angular/common';
import { Component, NgModule, OnInit, ChangeDetectorRef } from '@angular/core';
import { Campo } from '../../interfaces/campos';
import { Listado } from '../../interfaces/listado';
import { HttpClient } from '@angular/common/http';
import { FormsModule, NgModel } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { ObtenerDataService } from '../../servicios/obtener-data.service';
import { ActivatedRoute } from '@angular/router';

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
  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private obtenerDataService: ObtenerDataService,
    private route: ActivatedRoute
  ) {}

  async ngOnInit(): Promise<void> {
    const nombreJson = this.route.snapshot.paramMap.get('nombreJson') || '';
    const jsonMain: any = await this.cargarJson(nombreJson);

    this.alternaListadoFormulario = jsonMain.alternaListadoFormulario;
    const [camposPorFila, grid] = this.generarEstructura(jsonMain);
    this.generarBotonesFormulario(jsonMain);
    this.generarBotonesListado(jsonMain);

    console.log('jsonMain', jsonMain);
    this.camposMain = camposPorFila;
    this.gridMain = grid; // Guardar el grid principal
    this.datosGridMain = this.datosTablaMain;
    console.log('campos main', this.camposMain);

    this.mapeoColumnas = this.generarMapeoColumnas();

    let consulta = `SELECT * FROM ${jsonMain.tabla}`;

    if (jsonMain.groupBy) {
      consulta += ` GROUP BY ${jsonMain.groupBy}`;
    }

    if (jsonMain.orderBy) {
      consulta += ` ORDER BY ${jsonMain.orderBy}`;
    }

    consulta += ';';

    const dataMain: any = await this.obtenerData(consulta);

    this.datosGridMain = dataMain;
    this.datosTablaMain = dataMain;

    if (jsonMain.alternaListadoFormulario === true) {
      console.log('alternaListado es true');
      this.mostrarListado = true;
      this.mostrarFormulario = false;
      console.log('estado Mostrar Listado', this.mostrarListado);
      console.log('estado Mostrar Formulario', this.mostrarFormulario);
    }

    if (jsonMain.secciones && jsonMain.secciones.length > 0) {
      for (let seccion of jsonMain.secciones) {
        if (seccion.alternaListadoFormulario == false) {
          const jsonprueba: any = await this.cargarJson(seccion.origen);

          const [camposPorFilaSeccion, gridSeccion] =
            this.generarEstructura(jsonprueba);
          const camposSeccion = camposPorFilaSeccion;

          this.gridSecciones.push(gridSeccion);

          let consulta = `SELECT * FROM ${jsonprueba.tabla}`;

          if (jsonprueba.orderBy) {
            consulta += ` ORDER BY ${jsonprueba.orderBy}`;
          }

          const dataSeccion: any = await this.obtenerData(consulta);

          this.datosSecciones.push({
            nombre: seccion.nombre,
            campos: Object.values(camposSeccion),
            grid: gridSeccion,
            gridInfo: dataSeccion,
          });
        }
      }

      this.mapeoSecciones = this.generarMapeoSecciones();
    }
  }

  alternarListado() {
    if (this.alternaListadoFormulario == true) {
      this.mostrarListado = !this.mostrarListado;
      this.mostrarFormulario = !this.mostrarFormulario;
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

  seleccionarFila(fila: any) {
    console.log('Fila seleccionada:', fila);

    Object.values(this.camposMain).forEach((filaCampos: any) => {
      filaCampos.forEach((campo: any) => {
        const key = this.mapeoColumnas[campo.titulo];
        let valor = fila[key] || fila[campo.nombre];

        if (valor && typeof valor === 'string' && valor.includes('T')) {
          const fecha = new Date(valor);

          if (campo.tipo === 'date') {
            // Formato "YYYY-MM-DD" para input date
            valor = fecha.toISOString().split('T')[0];
          } else if (campo.tipo === 'datetime-local') {
            // Formato "YYYY-MM-DDTHH:mm" para input datetime-local
            valor = fecha.toISOString().slice(0, 16);
          }
        }

        campo.valorDefecto = valor;
      });
    });

    // Forzamos la actualización del DOM
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

            // Guardar los botones con su id y nombre original
            opcionesMenu = dataBotones.map((boton: any) => ({
              id: boton.id,
              nombre: boton.nombre,
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

          opcionesMenu = json.seccionesBody.formulario.botones.map(
            (botonStr: string) => {
              const partes = botonStr.split('|'); // Separar por "|"
              const id = partes[0];

              if (botonesDB.has(id)) {
                const botonDB = botonesDB.get(id) as {
                  id: number;
                  nombre: string;
                }; // ✅ Solución

                return {
                  id: parseInt(id),
                  nombre: partes[1] || botonDB.nombre, // Si no tiene nombre en JSON, usa el de la BD
                  accion:
                    partes[2] ||
                    `console.log('Ejecutando acción para ${botonDB.nombre}');`,
                };
              } else {
                console.warn(
                  `Botón con ID ${id} no encontrado en la base de datos`
                );
                return { id: parseInt(id), nombre: `Opción ${id}` };
              }
            }
          );

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
          // Obtener permisos
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

            // Obtener botones desde la base de datos
            const dataBotones: any = await this.obtenerData(consultaBotones);
            console.log(
              'Resultado de la segunda consulta (LISTADO):',
              dataBotones
            );

            // Guardar los botones con su id y nombre original
            opcionesMenu = dataBotones.map((boton: any) => ({
              id: boton.id,
              nombre: boton.nombre,
            }));

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
  guardarCambios() {
    const cambiosGuardados: { [key: string]: any } = {};

    for (const fila of Object.values(this.camposMain)) {
      for (const campo of fila) {
        if (campo.nombre) {
          if (campo && campo.fuente?.tipo !== 'array') {
            const elemento = document.getElementById(
              campo.nombre
            ) as HTMLInputElement;
            let valor = elemento.value;

            if (campo.tipo == 'datetime-local') {
              valor = this.formatearFecha(valor);
            }

            cambiosGuardados[campo.nombre] = valor;
          } else {
            console.log('Entrando a estado para el campo select...');
            const elemento = document.getElementById(
              campo.nombre
            ) as HTMLSelectElement;
            cambiosGuardados[campo.nombre] = campo.valorDefecto;
          }
        }
      }
    }

    console.log('Cambios guardados:', cambiosGuardados);
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

  calcularValorProductoEgreso() {
    console.log('valorProductoEgrero calculado');
  }
}
