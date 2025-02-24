import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { global } from '../../global'; // Importamos la URL de la API

@Injectable({
  providedIn: 'root',
})
export class ObtenerDataService {
  private apiUrl = global.urlApi + 'consulta/'; // Base de la URL

  constructor(private http: HttpClient) {}

  consultaData(consulta: any): Observable<any> {
    const body = { consulta }; // Enviamos la consulta en el body
    return this.http.post<any>(`${this.apiUrl}consultaData`, body);
  }
}
