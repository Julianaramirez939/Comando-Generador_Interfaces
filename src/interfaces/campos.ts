export interface Campo {
  titulo: string;
  nombre: string;
  class: string;
  tipoGenerico: string;
  tipoControl: string;
  accion: string;
  posicion: number;
  tipo: string;
  visible: boolean;
  opcionesListado: {
    visible: boolean;
    posicion: number;
    titulo: string;
    longitud: number;
    alineacion: string;
    ordenable: boolean;
    busqueda: boolean;
    formato: string;
  };
  fuente: {
    tipo: string;
    array?: {
      clave: string;
      valor: string;
      defecto?: boolean;
    }[];
  };
}
