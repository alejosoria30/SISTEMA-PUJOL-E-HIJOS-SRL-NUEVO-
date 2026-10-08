import { Component, OnInit } from '@angular/core';
import { StateService } from '../state.service';
import { AuthService } from '../../modules/auth';

@Component({
  selector: 'app-comprobantes',
  templateUrl: './comprobantes.component.html',
  styleUrls: [],
})
export class ComprobantesComponent implements OnInit {
  ventas: any[] = [];
  comprobantes: any[] = [];
  
  // Modal state
  isEmitirModalOpen = false;
  ventaSeleccionada: any = null;
  tipoComprobante = 'Ticket';

  // Ticket Preview
  isTicketModalOpen = false;
  ticketActivo: any = null;

  constructor(private stateService: StateService, private authService: AuthService) {}

  hasAction(action: 'read' | 'create' | 'update' | 'delete'): boolean {
    // Permiso 5 es Ventas, podríamos usar ese o crear un Permiso "Comprobantes"
    // Asumiremos que si puede ver Ventas o Caja, puede ver Comprobantes. Usaremos el de Ventas por ahora.
    return this.authService.hasAction(5, action);
  }

  ngOnInit(): void {
    // Escuchar las ventas (Receipts)
    this.stateService.receipts$.subscribe(data => {
      this.ventas = data;
    });

    // Escuchar comprobantes
    this.stateService.comprobantes$.subscribe(data => {
      this.comprobantes = data;
    });
  }

  // Verifica si una venta ya tiene un comprobante emitido
  tieneComprobante(idVenta: number): boolean {
    return this.comprobantes.some(c => c.idVenta === idVenta);
  }

  getComprobanteDeVenta(idVenta: number) {
    return this.comprobantes.find(c => c.idVenta === idVenta);
  }

  abrirEmitirModal(venta: any) {
    this.ventaSeleccionada = venta;
    this.tipoComprobante = 'Ticket';
    this.isEmitirModalOpen = true;
  }

  emitirComprobante() {
    if (!this.ventaSeleccionada) return;

    this.stateService.emitirComprobante(this.ventaSeleccionada.id, this.tipoComprobante, (success, num) => {
      if (success) {
        alert(`Comprobante ${num} generado exitosamente.`);
        this.isEmitirModalOpen = false;
        this.ventaSeleccionada = null;
      }
    });
  }

  verTicket(comp: any) {
    this.ticketActivo = comp;
    this.isTicketModalOpen = true;
  }

  imprimir() {
    window.print();
  }
}
