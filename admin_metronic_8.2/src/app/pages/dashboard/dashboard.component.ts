import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
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
  private subs: Subscription[] = [];

  constructor(
    private http: HttpClient,
    public auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const authSub = this.auth.currentUser$.subscribe(user => {
      if (user && this.auth.hasAction(1)) {
        this.cargar();
      }
    });
    this.subs.push(authSub);

    if (this.auth.currentUserValue && this.auth.hasAction(1)) {
      this.cargar();
    }
  }

  ngOnDestroy(): void {
    this.consulta?.unsubscribe();
    this.subs.forEach(s => s.unsubscribe());
  }

  get currentUserFullname(): string {
    const user = this.auth.currentUserValue;
    return user?.fullname || user?.username || 'Usuario';
  }

  get hasDashboardPermission(): boolean {
    return this.auth.hasAction(1);
  }

  onPeriodoChange(nuevoPeriodo: string): void {
    this.periodo = nuevoPeriodo;
    if (this.periodo !== 'personalizado') {
      this.cargar();
    }
  }

  onAgruparChange(nuevaAgrupacion: string): void {
    this.agrupar = nuevaAgrupacion;
    this.cargar();
  }

  onFechaChange(): void {
    if (this.periodo === 'personalizado' && this.desde && this.hasta) {
      this.cargar();
    }
  }

  cargar(): void {
    if (!this.auth.currentUserValue) {
      return;
    }
    if (!this.auth.hasAction(1)) {
      this.mensaje = 'Seleccione un módulo habilitado.';
      this.cargando = false;
      this.cdr.detectChanges();
      return;
    }
    this.consulta?.unsubscribe();

    if (this.periodo === 'personalizado' && (!this.desde || !this.hasta)) {
      this.mensaje = 'Seleccione las fechas de inicio y fin.';
      this.cargando = false;
      this.cdr.detectChanges();
      return;
    }

    this.cargando = true;
    this.mensaje = '';
    this.cdr.detectChanges();

    const params: any = {
      periodo: this.periodo,
      agrupar: this.agrupar
    };
    if (this.periodo === 'personalizado') {
      params.desde = this.desde;
      params.hasta = this.hasta;
    }

    this.consulta = this.http.get(environment.apiUrl + '/dashboard', { params }).subscribe({
      next: (datos: any) => {
        this.datos = datos;
        this.mensaje = '';
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: error => {
        this.mensaje = error?.error?.message || 'No se pudieron cargar los indicadores.';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }
}
