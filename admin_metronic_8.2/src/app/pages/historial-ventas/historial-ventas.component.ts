import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription, timeout, finalize } from 'rxjs';
import { StateService, Receipt } from '../state.service';
import { AuthService } from '../../modules/auth/services/auth.service';
import { environment } from 'src/environments/environment';

/** Historial de operaciones del punto de venta presencial (no es el libro de caja). */
@Component({
  selector: 'app-historial-ventas',
  templateUrl: './historial-ventas.component.html',
  styleUrls: ['./historial-ventas.component.scss'],
})
export class HistorialVentasComponent implements OnInit, OnDestroy {
  receipts: Receipt[] = [];
  searchQuery = '';
  selectedMethod = '';
  selectedChannel = '';
  selectedDate = '';
  mostrarPruebas = false;
  mostrarFiltrosAvanzados = false;
  mensaje = '';
  procesandoId: number | null = null;
  opcionesAbiertasId: number | null = null;
  showReceiptModal = false;
  activeReceipt: Receipt | null = null;
  vistaModal: 'detalle' | 'ticket' = 'detalle';
  private suscripcion?: Subscription;

  constructor(
    private stateService: StateService,
    private http: HttpClient,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.suscripcion = this.stateService.receipts$.subscribe(data => {
      // Mantiene el orden más reciente primero, sin alterar el estado compartido.
      this.receipts = [...(data || [])].reverse();
    });
    if (this.stateService.receipts$.value.length === 0) this.stateService.fetchVentas();
  }

  ngOnDestroy(): void { this.suscripcion?.unsubscribe(); }

  get esAdministrador(): boolean {
    return !!this.auth.currentUserValue?.roles?.includes(1);
  }

  // Las clasificaciones de prueba y anulaciones no forman parte de la facturación habitual.
  get ventasVigentes(): Receipt[] {
    return this.receipts.filter(venta => !venta.esPrueba &&
      (venta.estadoVenta || '').toLowerCase() !== 'anulada');
  }

  getTotalFacturado(): number {
    return this.ventasVigentes.reduce((total, venta) => total + this.importeSeguro(venta.total), 0);
  }

  // Es un desglose por medio registrado; no representa el arqueo del cajón.
  getTotalEfectivo(): number {
    return this.ventasVigentes.filter(venta => venta.method === 'Efectivo' && this.pagoAprobado(venta))
      .reduce((total, venta) => total + this.importeSeguro(venta.total), 0);
  }

  getTotalElectronico(): number {
    const medios = ['Transferencia', 'Transferencia bancaria', 'Mercado Pago'];
    return this.ventasVigentes.filter(venta => medios.includes(venta.method) && this.pagoAprobado(venta))
      .reduce((total, venta) => total + this.importeSeguro(venta.total), 0);
  }

  private importeSeguro(monto: number): number {
    const valor = Number(monto);
    return Number.isFinite(valor) ? valor : 0;
  }

  private pagoAprobado(venta: Receipt): boolean {
    return (venta.estadoCobro || '').toLowerCase() === 'aprobado';
  }

  getFilteredReceipts(): Receipt[] {
    const busqueda = this.searchQuery.trim().toLocaleLowerCase('es-AR');
    return this.receipts.filter(venta => {
      if ((!this.esAdministrador || !this.mostrarPruebas) && venta.esPrueba) return false;
      if (busqueda && !(
        (venta.clientName || '').toLocaleLowerCase('es-AR').includes(busqueda) ||
        ('rec-' + venta.id).includes(busqueda) ||
        venta.id.toString().includes(busqueda) ||
        (venta.usuarioResponsable || '').toLocaleLowerCase('es-AR').includes(busqueda) ||
        (venta.details || []).some(detalle =>
          (detalle.productName || '').toLocaleLowerCase('es-AR').includes(busqueda))
      )) return false;
      if (this.selectedMethod && venta.method !== this.selectedMethod) return false;
      if (this.selectedChannel && venta.tipoVenta !== this.selectedChannel) return false;
      if (this.selectedDate && (venta.date || '').slice(0, 10) !== this.selectedDate) return false;
      return true;
    });
  }

  trackById(_index: number, venta: Receipt): number { return venta.id; }

  nombreMetodo(venta: Receipt | null): string {
    const metodo = venta?.method;
    return metodo && metodo !== 'Sin documentar' ? metodo : 'No registrado';
  }

  nombreModalidad(venta: Receipt | null): string {
    if (venta?.tipoVenta === 'mayorista') return 'Mayorista';
    if (venta?.tipoVenta === 'minorista') return 'Minorista';
    return 'No registrada';
  }

  estadoVentaTexto(venta: Receipt | null): string {
    const estado = (venta?.estadoVenta || '').toLowerCase();
    if (estado === 'completada') return 'Completada';
    if (estado === 'anulada') return 'Anulada';
    return 'Sin registrar';
  }

  estadoCobroTexto(venta: Receipt | null): string {
    const estado = (venta?.estadoCobro || '').toLowerCase();
    if (estado === 'aprobado') return 'Aprobado';
    if (estado === 'pendiente') return 'Pendiente';
    if (estado === 'rechazado') return 'Rechazado';
    return 'No informado';
  }

  alternarOpciones(ventaId: number): void {
    if (!this.esAdministrador) return;
    this.opcionesAbiertasId = this.opcionesAbiertasId === ventaId ? null : ventaId;
  }

  marcarComoPrueba(venta: Receipt): void {
    if (!this.esAdministrador || this.procesandoId !== null) return;
    const excluir = !venta.esPrueba;
    const explicacion = excluir
      ? 'Se excluirá de los indicadores comerciales. La operación, los cobros, el stock, los comprobantes y la caja NO serán modificados.'
      : 'Volverá a contarse en los indicadores comerciales. No se modificará la operación original.';
    if (!window.confirm(`Venta #REC-${venta.id}: ¿${excluir ? 'excluir como operación de prueba' : 'volver a incluir en indicadores'}?\n\n${explicacion}`)) return;

    this.mensaje = '';
    this.procesandoId = venta.id;
    this.http.post(`${environment.apiUrl}/ventas/marcar-prueba`, {
      id: venta.id, esPrueba: excluir
    }).pipe(timeout(15000), finalize(() => this.procesandoId = null)).subscribe({
      next: () => {
        this.opcionesAbiertasId = null;
        this.mensaje = `Se actualizó la clasificación de la venta #REC-${venta.id}. No se modificaron sus movimientos.`;
        this.stateService.fetchVentas();
      },
      error: error => {
        this.mensaje = error?.error?.message || 'No se pudo cambiar la clasificación de la venta.';
      }
    });
  }

  viewReceipt(receipt: Receipt): void {
    this.activeReceipt = receipt;
    this.vistaModal = 'detalle';
    this.showReceiptModal = true;
  }

  closeReceiptModal(): void {
    this.showReceiptModal = false;
    this.activeReceipt = null;
    this.vistaModal = 'detalle';
  }

  mostrarTicket(): void { this.vistaModal = 'ticket'; }
  mostrarDetalle(): void { this.vistaModal = 'detalle'; }

  printAction(): void {
    if (this.showReceiptModal && this.activeReceipt && this.vistaModal === 'ticket') window.print();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedMethod = '';
    this.selectedChannel = '';
    this.selectedDate = '';
    this.mostrarPruebas = false;
  }
}
