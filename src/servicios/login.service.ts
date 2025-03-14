import { Injectable } from '@angular/core';
import { global } from '../../global'; // Importamos la URL de la API
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private apiUrl = global.urlRackApi + 'login'; // URL completa del endpoint

  constructor(private http: HttpClient) {}

  login(user: string, password: string, empresa: string): Observable<any> {
    const body = { user, password };
    const headers = new HttpHeaders({ empresa: empresa });

    return this.http.post(this.apiUrl, body, { headers });
  }

  getLogo(
    empresa: string,
    idusuariosesion: string,
    token: any
  ): Observable<any> {
    const url = `${global.urlRackApi}empresa/getUrlLogo`; 
    const headers = new HttpHeaders({
      empresa: empresa,
      idusuariosesion: idusuariosesion,
      token: token,
    });

    return this.http.get(url, { headers });
  }
}
