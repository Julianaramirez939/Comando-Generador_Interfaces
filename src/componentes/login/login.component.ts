import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { LoginService } from '../../servicios/login.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  usuario: string = '';
  contrasena: string = '';
  mostrarClave: boolean = false;
  empresa: string = ''; // Se obtiene desde la URL
  logoUrl: any;

  constructor(
    private loginService: LoginService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    // Obtener el parámetro 'empresa' desde la URL
    this.empresa = this.route.snapshot.paramMap.get('empresa') || '';

    if (!this.empresa) {
      Swal.fire('Error', 'No se encontró la empresa en la URL', 'error');
    }
  }

  ingresar() {
    if (!this.usuario || !this.contrasena) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos Vacíos',
        text: 'Por favor, complete todos los campos.',
      });
      return;
    }

    this.loginService
      .login(this.usuario, this.contrasena, this.empresa)
      .subscribe({
        next: (response) => {
          console.log('response login', response);
          localStorage.setItem('empresa', this.empresa);
          localStorage.setItem('token', response.token);
          localStorage.setItem('idusuariosesion', this.usuario.toUpperCase());

          console.log('Datos guardados en localStorage:');
          console.log('Empresa:', localStorage.getItem('empresa'));
          console.log('Token:', localStorage.getItem('token'));
          console.log(
            'ID Usuario Sesión:',
            localStorage.getItem('idusuariosesion')
          );

          this.router.navigate([`/main/${this.usuario}`]);
        },
        error: () => {
          Swal.fire({
            icon: 'error',
            title: 'Error de autenticación',
            text: 'Usuario o contraseña incorrectos.',
          });
        },
      });
  }
}
