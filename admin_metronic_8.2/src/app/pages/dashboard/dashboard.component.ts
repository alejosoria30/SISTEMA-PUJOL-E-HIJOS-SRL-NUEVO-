import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from '../../modules/auth/services/auth.service';

@Component({selector:'app-dashboard',templateUrl:'./dashboard.component.html'})
export class DashboardComponent implements OnInit, OnDestroy {
  datos: any;
  mensaje = '';
  periodo = 'hoy';
  agrupar = 'dia';
  desde = '';
  hasta = '';
  cargando = false;
  private consulta?: Subscription;
  private authSub?: Subscription;

  constructor(private http: HttpClient, public auth: AuthService, private cdr: ChangeDetectorRef) {}

  get currentUserFullname(): string {
    const user = this.auth.currentUserValue;
    return user?.fullname || user?.username || 'Usuario';
  }

  ngOnInit() {
    this.cargar();
    this.authSub = this.auth.currentUser$.subscribe(u => {
      if (u && !this.datos) {
        this.cargar();
      }
    });
  }

  ngOnDestroy() {
    this.consulta?.unsubscribe();
    this.authSub?.unsubscribe();
  }

  cargar() {
    if (!this.auth.hasAction(1)) {
      this.mensaje = 'Seleccione un módulo habilitado.';
      this.cargando = false;
      this.cdr.detectChanges();
      return;
    }
    this.consulta?.unsubscribe();
    this.datos = null;
    if (this.periodo === 'personalizado' && (!this.desde || !this.hasta)) {
      this.mensaje = 'Seleccione las fechas de inicio y fin.';
      this.cargando = false;
      this.cdr.detectChanges();
      return;
    }
    this.cargando = true;
    this.mensaje = 'Consultando el período…';
    this.cdr.detectChanges();
    const params = {periodo:this.periodo, agrupar:this.agrupar, desde:this.desde, hasta:this.hasta};
    this.consulta = this.http.get(environment.apiUrl + '/dashboard', {params}).subscribe({
      next: datos => {
        this.datos = datos;
        this.mensaje = '';
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: error => {
        this.mensaje = error.error?.message || 'No se pudieron cargar los indicadores.';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }
}
