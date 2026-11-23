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
  private consulta?: Subscription;
  constructor(private http: HttpClient, public auth: AuthService, private cdr: ChangeDetectorRef) {}
  ngOnInit() { this.cargar(); }
  ngOnDestroy() { this.consulta?.unsubscribe(); }
  cargar() {
    if (!this.auth.hasAction(1)) { this.mensaje = 'Seleccione un módulo habilitado.'; return; }
    this.consulta?.unsubscribe();
    this.datos = null;
    if (this.periodo === 'personalizado' && (!this.desde || !this.hasta)) {
      this.mensaje = 'Seleccione las fechas de inicio y fin.';
      return;
    }
    this.mensaje = 'Consultando el período…';
    const params = {periodo:this.periodo, agrupar:this.agrupar, desde:this.desde, hasta:this.hasta};
    this.consulta = this.http.get(environment.apiUrl + '/dashboard', {params}).subscribe({
      next: datos => { this.datos = datos; this.mensaje = ''; this.cdr.detectChanges(); },
      error: error => { this.mensaje = error.error?.message || 'No se pudieron cargar los indicadores.'; this.cdr.detectChanges(); }
    });
  }
}
