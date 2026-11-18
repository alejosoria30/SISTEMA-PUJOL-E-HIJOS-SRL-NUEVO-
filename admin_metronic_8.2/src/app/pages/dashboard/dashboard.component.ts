import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from '../../modules/auth/services/auth.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  datos: any = null;
  mensaje = '';
  periodo = 'hoy';
  agrupar = 'dia';
  desde = '';
  hasta = '';
  cargando = false;
  private consulta?: Subscription;

  constructor(private http: HttpClient, public auth: AuthService) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.consulta?.unsubscribe();
  }

  get currentUserFullname(): string {
    const user = this.auth.currentUserValue;
    return user?.fullname || user?.username || 'Usuario';
  }

  get hasDashboardPermission(): boolean {
    return this.auth.hasAction(1);
  }

  cargar(): void {
    if (!this.auth.hasAction(1)) {
      this.mensaje = 'Seleccione un módulo habilitado.';
      return;
    }
    this.consulta?.unsubscribe();
    this.cargando = true;
    if (this.periodo === 'personalizado' && (!this.desde || !this.hasta)) {
      this.mensaje = 'Seleccione las fechas de inicio y fin.';
      this.cargando = false;
      return;
    }
    this.mensaje = '';
    const params = { periodo: this.periodo, agrupar: this.agrupar, desde: this.desde, hasta: this.hasta };
    this.consulta = this.http.get(environment.apiUrl + '/dashboard', { params }).subscribe({
      next: (datos: any) => {
        this.datos = datos;
        this.mensaje = '';
        this.cargando = false;
      },
      error: error => {
        this.mensaje = error.error?.message || 'No se pudieron cargar los indicadores.';
        this.cargando = false;
      }
    });
  }
}
