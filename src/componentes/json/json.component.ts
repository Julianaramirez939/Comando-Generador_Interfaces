import { CommonModule } from '@angular/common';
import { Component, NgModule, OnInit } from '@angular/core';
import { Campo } from '../../interfaces/campos';
import { Listado } from '../../interfaces/listado';
import { Seccion } from '../../interfaces/secciones';
import jsonMain from '../../assets/posDocumentoSoporte.json';
import jsonSeccion from '../../assets/posEgresoItem.json';
import { HttpClient } from '@angular/common/http';
import { FormsModule, NgModel } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';

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
  jsonsUrl = '/assets/';
  datos: any = {};
  gridMain: any = [];
  gridSecciones: any = [];

  constructor(private http: HttpClient) {}

  async ngOnInit(): Promise<void> {
    const [camposPorFila, grid] = this.generarEstructura(jsonMain);
    this.camposMain = camposPorFila;
    this.gridMain = grid; // Guardar el grid principal
    console.log('campos main', this.camposMain);
    this.jsonSeccion = jsonSeccion;

    if (jsonMain.secciones && jsonMain.secciones.length > 0) {
      for (let seccion of jsonMain.secciones) {
        if (seccion.alternaListadoFormulario == false) {
          const jsonprueba = await this.cargarJson(seccion.origen);

          const [camposPorFilaSeccion, gridSeccion] =
            this.generarEstructura(jsonprueba);
          const camposSeccion = camposPorFilaSeccion;

          this.gridSecciones.push(gridSeccion);

          this.datosSecciones.push({
            nombre: seccion.nombre,
            campos: Object.values(camposSeccion),
            grid: gridSeccion,
          });
        }
      }
      console.log('datosSecciones', this.datosSecciones);
    }
  }
  generarEstructura(json: any) {
    this.datos = json;
    const camposPorFila: { [key: number]: any[] } = {};
    let grid: any = []; // Grid donde se colocarán los campos
  
    if (this.datos.campos && this.datos.campos.length > 0) {
      // Filtrar y procesar los campos que son visibles y que no son de tipo "bd" en su fuente
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
            valorDefecto: valorDefecto,
          };
  
          const fila = campo.posicion || 1;
          if (!camposPorFila[fila]) {
            camposPorFila[fila] = [];
          }
          camposPorFila[fila].push(campoProcesado);
        });
  
      // Procesar los botones (como lo mencionaste previamente)
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
  
        // Si el grupo actual tiene la misma longitud y título, añadir el campo
        if (currentGroup && currentGroup.longitud === longitud && currentGroup.titulo === titulo) {
          currentGroup.campos.push(campo);
        } else {
          // Si no, empezar un nuevo grupo con longitud y título específicos
          if (currentGroup) groupedFields.push(currentGroup);
          currentGroup = {
            longitud: longitud,
            titulo: titulo,
            campos: [campo],
          };
        }
      }
      if (currentGroup) groupedFields.push(currentGroup); // Agregar el último grupo
  
      // Asignamos el grid con los campos agrupados
      grid = groupedFields.map(group => ({
        titulo: group.titulo,
        longitud: group.longitud,
        campos: group.campos,
      }));
  
      console.log('📌 Grid final:', grid);
    }
  
    return [camposPorFila, grid];
  }
  
  

  async cargarJson(nombreJson: string) {
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

    // Recorremos todos los campos
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
          console.log(`Ejecutando código: ${cmd}`);
          eval(cmd);
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
