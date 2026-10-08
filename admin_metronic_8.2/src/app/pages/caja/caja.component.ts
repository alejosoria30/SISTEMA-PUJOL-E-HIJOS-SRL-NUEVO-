import { Component, OnInit } from '@angular/core';
import { StateService } from '../state.service';
import { AuthService } from '../../modules/auth';

@Component({
  selector: 'app-caja',
  templateUrl: './caja.component.html',
  styleUrls: [],
})
export class CajaComponent implements OnInit {
  turnoActual: any = null;
  movimientos: any[] = [];

  // Apertura
  montoInicial = 0;

  // Cierre
  isCerrarModalOpen = false;
  montoFinalReal = 0;

  // Movimiento
  isMovModalOpen = false;
  movTipo: 'Ingreso' | 'Egreso' = 'Ingreso';
  movConcepto = '';
  movMonto = 0;

  constructor(private stateService: StateService, private authService: AuthService) {}

  hasAction(action: 'read' | 'create' | 'update' | 'delete'): boolean {
    return this.authService.hasAction(3, action); // Permiso 3
  }

  ngOnInit(): void {
    this.stateService.cajaTurno$.subscribe(turno => {
      this.turnoActual = turno;
    });
    this.stateService.cajaMovimientos$.subscribe(movs => {
      this.movimientos = movs;
    });
  }

  abrirCaja() {
    if (this.montoInicial < 0) {
      alert('El monto inicial no puede ser negativo.');
      return;
    }
    this.stateService.abrirCaja(this.montoInicial, (success) => {
      if (success) {
        alert('Caja abierta correctamente.');
        this.montoInicial = 0;
      }
    });
  }

  abrirModalCierre() {
    if (!this.turnoActual) return;
    this.montoFinalReal = this.turnoActual.saldoActual;
    this.isCerrarModalOpen = true;
  }

  cerrarCaja() {
    if (!this.turnoActual) return;
    const diferencia = this.montoFinalReal - this.turnoActual.saldoActual;
    
    this.stateService.cerrarCaja(this.turnoActual.idTurno, this.montoFinalReal, diferencia, (success) => {
      if (success) {
        alert(`Caja cerrada. Diferencia detectada: $${diferencia}`);
        this.isCerrarModalOpen = false;
      }
    });
  }

  abrirModalMov() {
    this.movTipo = 'Ingreso';
    this.movConcepto = '';
    this.movMonto = 0;
    this.isMovModalOpen = true;
  }

  registrarMovimiento() {
    if (!this.turnoActual || !this.movConcepto || this.movMonto <= 0) {
      alert('Debe completar el concepto y el monto (mayor a 0).');
      return;
    }
    
    this.stateService.registrarMovimientoCaja(this.turnoActual.idTurno, this.movTipo, this.movConcepto, this.movMonto, (success) => {
      if (success) {
        this.isMovModalOpen = false;
      }
    });
  }
}
