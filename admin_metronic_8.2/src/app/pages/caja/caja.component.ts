
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  NgZone
} from '@angular/core';

import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';

import { StateService } from '../state.service';
import { AuthService } from '../../modules/auth';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-caja',
  templateUrl: './caja.component.html',
  styleUrls: [],
})
export class CajaComponent implements OnInit, OnDestroy {

  private apiUrl = environment.apiUrl;
  private suscripciones = new Subscription();
  private destruido = false;
  private vistaIniciada = false;

  // ESTADO ACTUAL
  turnoActual: any = null;
  movimientos: any[] = [];
  montoInicial: number | null = null;

  // PROTECCION DE OPERACIONES
  guardandoApertura = false;
  guardandoMovimiento = false;
  guardandoCierre = false;

  // CIERRE Y ARQUEO
  isCerrarModalOpen = false;
  readonly denominaciones = [100, 200, 500, 1000, 2000, 10000, 20000];
  billetes: Record<number, number> = {};
  otros = 0;
  observaciones = '';
  get montoFinalReal(): number {
    return this.denominaciones.reduce((suma, valor) => suma + valor * (this.billetes[valor] || 0), Number(this.otros) || 0);
  }

  // MOVIMIENTOS MANUALES
  isMovModalOpen = false;
  movTipo: 'Ingreso' | 'Egreso' = 'Ingreso';
  movConcepto = '';
  movMonto = 0;

  private movimientoRequestKey = '';

  // HISTORIAL DE CAJA
  historialTurnos: any[] = [];
  movimientosHistorial: any[] = [];

  turnoSeleccionado: any = null;

  cargandoHistorial = false;
  cargandoDetalle = false;

  errorHistorial = '';

  mostrarDetalleHistorial = false;

  constructor(
    public router: Router,
    private stateService: StateService,
    private authService: AuthService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private zona: NgZone
  ) {}

  // PERMISOS
  hasAction(
    action: 'read' | 'create' | 'update' | 'delete'
  ): boolean {
    return this.authService.hasAction(3, action);
  }

  puedeVerHistorialCaja(): boolean {
    return this.authService.hasPermission('Ver historial de caja');
  }

  // La vista histórica tiene su propia ruta y permiso: no se duplica en Gestión de caja.
  esVistaHistorialCaja(): boolean {
    return this.router.url.split('?')[0] === '/historial-caja';
  }

  // El campo admite únicamente pesos positivos con centavos (DECIMAL(10,2) en MySQL).
  esMontoInicialValido(): boolean {
    const monto = this.montoInicial;
    if (typeof monto !== 'number' || !Number.isFinite(monto)) {
      return false;
    }
    const centavos = monto * 100;
    return monto >= 0.01 && monto <= 99999999.99 &&
      Math.abs(centavos - Math.round(centavos)) < 0.000001;
  }

  // ACTUALIZACION INMEDIATA DE LA VISTA
  private actualizarVista(accion: () => void): void {

    if (this.destruido) {
      return;
    }

    this.zona.run(() => {
      accion();

      if (this.vistaIniciada) {
        this.cdr.detectChanges();
      }
    });
  }

  // INICIALIZACION
  ngOnInit(): void {

    this.suscripciones.add(
      this.stateService.cajaTurno$.subscribe(turno => {

        this.actualizarVista(() => {
          this.turnoActual = turno;
        });

      })
    );

    this.suscripciones.add(
      this.stateService.cajaMovimientos$.subscribe(movs => {

        this.actualizarVista(() => {
          this.movimientos = movs || [];
        });

      })
    );

    this.vistaIniciada = true;

    // Cada ruta consulta únicamente lo que necesita.
    if (this.esVistaHistorialCaja()) {
      if (this.puedeVerHistorialCaja()) this.cargarHistorial();
    } else if (this.hasAction('read')) {
      this.stateService.fetchCajaTurno();
    }
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.suscripciones.unsubscribe();
  }

  // ABRIR CAJA
  abrirCaja(): void {

    if (this.guardandoApertura || !this.hasAction('create') || this.esVistaHistorialCaja()) {
      return;
    }

    // Number(null) y Number('') valen cero. Se valida el dato original ANTES de convertirlo.
    if (!this.esMontoInicialValido()) {
      alert('El monto inicial es obligatorio, debe ser mayor que $0 y tener hasta dos decimales.');
      return;
    }
    const monto = Number(this.montoInicial);

    if (this.turnoActual) {
      alert('Ya existe un turno abierto.');
      return;
    }

    this.guardandoApertura = true;

    this.stateService.abrirCaja(monto, success => {

      this.actualizarVista(() => {
        this.guardandoApertura = false;

        if (success) {
          this.montoInicial = null;
        }
      });

      if (success) {
        alert('Caja abierta correctamente.');
      }
    });
  }

  // MODAL DE CIERRE
  abrirModalCierre(): void {

    if (!this.turnoActual || this.guardandoCierre) {
      return;
    }

    this.billetes = {};
    this.denominaciones.forEach(valor => this.billetes[valor] = 0);
    this.otros = 0;
    this.observaciones = '';

    this.isCerrarModalOpen = true;
  }

  // CALCULAR DIFERENCIA
  getDiferenciaCaja(): number {

    if (!this.turnoActual) {
      return 0;
    }

    const esperado = Number(
      this.turnoActual.saldoActual
    );

    const contado = Number(this.montoFinalReal);

    return Math.round(
      (contado - esperado) * 100
    ) / 100;
  }

  // CERRAR CAJA
  cerrarCaja(): void {

    if (!this.turnoActual || this.guardandoCierre) {
      return;
    }

    const monto = Number(this.montoFinalReal);

    if (this.otros < 0 || this.denominaciones.some(valor => !Number.isInteger(this.billetes[valor]) || this.billetes[valor] < 0) || !Number.isFinite(monto) || monto < 0) {
      alert('Ingresá el efectivo contado correctamente.');
      return;
    }

    const diferencia = this.getDiferenciaCaja();

    const confirmado = confirm(
      '¿Confirmar cierre de caja?\n\n' +
      'Efectivo contado: $' + monto.toFixed(2) +
      '\nDiferencia estimada: $' +
      diferencia.toFixed(2)
    );

    if (!confirmado) {
      return;
    }

    this.guardandoCierre = true;

    this.stateService.cerrarCaja(
      this.turnoActual.idTurno,
      monto,
      diferencia,
      success => {

        this.actualizarVista(() => {
          this.guardandoCierre = false;

          if (success) {
            this.isCerrarModalOpen = false;
          }
        });

        if (success) {

          // El historial se consulta solo desde su pantalla independiente.
          alert('Caja cerrada correctamente.');
        }
      }, {billetes:this.billetes, otros:this.otros || 0, observaciones:this.observaciones}
    );
  }

  // ABRIR MODAL DE MOVIMIENTO
  abrirModalMov(): void {

    if (!this.turnoActual || this.guardandoMovimiento) {
      return;
    }

    this.movTipo = 'Ingreso';
    this.movConcepto = '';
    this.movMonto = 0;

    this.movimientoRequestKey = crypto.randomUUID();

    this.isMovModalOpen = true;
  }

  // REGISTRAR MOVIMIENTO
  registrarMovimiento(): void {

    if (this.guardandoMovimiento) {
      return;
    }

    if (!this.turnoActual) {
      alert('Debés abrir la caja.');
      return;
    }

    const concepto = this.movConcepto.trim();
    const monto = Number(this.movMonto);

    if (
      !concepto ||
      !Number.isFinite(monto) ||
      monto <= 0
    ) {
      alert('Completá el concepto y el monto.');
      return;
    }

    if (!this.movimientoRequestKey) {
      this.movimientoRequestKey = crypto.randomUUID();
    }

    this.guardandoMovimiento = true;

    const payload = {
      idTurno: this.turnoActual.idTurno,
      tipoMovimiento: this.movTipo,
      concepto,
      monto,
      requestKey: this.movimientoRequestKey
    };

    this.suscripciones.add(
      this.http.post<any>(
        `${this.apiUrl}/caja/movimiento`,
        payload
      ).subscribe({

        next: respuesta => {

          this.actualizarVista(() => {
            this.guardandoMovimiento = false;

            if (respuesta.success) {
              this.isMovModalOpen = false;
              this.movConcepto = '';
              this.movMonto = 0;
              this.movimientoRequestKey = '';
            }
          });

          if (respuesta.success) {
            this.stateService.fetchCajaTurno();
          } else {
            alert(
              respuesta.message ||
              'No se pudo guardar el movimiento.'
            );
          }
        },

        error: error => {

          console.error(error);

          this.actualizarVista(() => {
            this.guardandoMovimiento = false;
          });

          alert(
            'No se pudo confirmar la operación. ' +
            'Verificá los movimientos antes de reintentar.'
          );
        }
      })
    );
  }

  // HISTORIAL AUTOMATICO
  cargarHistorial(): void {

    if (!this.esVistaHistorialCaja() || !this.puedeVerHistorialCaja() || this.cargandoHistorial) {
      return;
    }

    this.cargandoHistorial = true;
    this.errorHistorial = '';

    this.suscripciones.add(
      this.http.get<any>(
        `${this.apiUrl}/caja/historial`
      ).subscribe({

        next: respuesta => {

          const registros = Array.isArray(respuesta)
            ? respuesta
            : respuesta?.data;

          this.actualizarVista(() => {
            this.historialTurnos =
              Array.isArray(registros) ? registros : [];

            this.cargandoHistorial = false;
            this.errorHistorial = '';
          });
        },

        error: error => {

          console.error(
            'Error cargando historial:',
            error
          );

          this.actualizarVista(() => {
            this.cargandoHistorial = false;
            this.errorHistorial =
              'No se pudo conectar con el historial de caja.';
          });
        }
      })
    );
  }

  // VER DETALLE DE TURNO
  verDetalleTurno(turno: any): void {

    if (!this.esVistaHistorialCaja() || !this.puedeVerHistorialCaja() || !turno || !turno.idTurno) {
      return;
    }

    this.turnoSeleccionado = turno;
    this.movimientosHistorial = [];

    this.mostrarDetalleHistorial = true;
    this.cargandoDetalle = true;

    this.suscripciones.add(
      this.http.get<any[]>(
        `${this.apiUrl}/caja/movimientos?idTurno=${turno.idTurno}`
      ).subscribe({

        next: respuesta => {

          this.actualizarVista(() => {
            this.movimientosHistorial =
              Array.isArray(respuesta) ? respuesta : [];

            this.cargandoDetalle = false;
          });
        },

        error: error => {

          console.error(error);

          this.actualizarVista(() => {
            this.cargandoDetalle = false;
          });

          alert('No se pudieron cargar los movimientos.');
        }
      })
    );
  }

  // CERRAR DETALLE
  cerrarDetalleTurno(): void {

    this.mostrarDetalleHistorial = false;
    this.turnoSeleccionado = null;
    this.movimientosHistorial = [];
  }

}
