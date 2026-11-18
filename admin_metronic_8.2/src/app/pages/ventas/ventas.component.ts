import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { StateService, StockItem, TipoVenta } from '../state.service';
import { AuthService } from '../../modules/auth';

interface CartItem {
  productId: number;
  name: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
  precioValido: boolean;
}

@Component({
  selector: 'app-ventas',
  templateUrl: './ventas.component.html',
  styleUrls: ['./ventas.component.scss'],
})
export class VentasComponent implements OnInit, OnDestroy {
  stockItems: StockItem[] = [];
  cart: CartItem[] = [];

  // Modalidad elegida para esta venta. El servidor verifica y calcula el precio real.
  tipoVenta: TipoVenta = 'mayorista';
  paymentMethod: 'Efectivo' | 'Transferencia' | 'Transferencia bancaria' | 'Mercado Pago' = 'Efectivo';

  // POS sin selector masivo: consulta rápida local en los productos cargados.
  @ViewChild('campoBuscar') campoBuscar?: ElementRef<HTMLInputElement>;
  busquedaProducto = '';
  resultadosBusqueda: StockItem[] = [];
  totalCoincidencias = 0;
  indiceBusqueda = 0;
  busquedaActiva = false;
  currentProductId = '';
  currentQty = 1;
  acreditacionConfirmada = false;
  mostrarCobrosQR = false;

  cajas: any[] = [];
  cobros: any[] = [];
  idCaja = 0;
  mensaje = '';
  enviando = false;
  claveOperacion = crypto.randomUUID();

  readonly api = environment.apiUrl;
  private subscriptions: Subscription[] = [];

  constructor(
    private http: HttpClient,
    private stateService: StateService,
    private authService: AuthService
  ) {}

  hasAction(action: 'read' | 'create' | 'update' | 'delete'): boolean {
    return this.authService.hasAction(5, action);
  }

  permiteQR(accion: 'read' | 'create' = 'read'): boolean { return this.authService.hasAction(14, accion); }

  ngOnInit(): void {
    if (this.permiteQR()) this.http.get<any[]>(this.api + '/mp/cajas').subscribe({
      next: (resultado) => this.cajas = resultado,
      error: (error) => console.error('Error al consultar cajas QR:', error)
    });

    this.subscriptions.push(
      this.stateService.stock$.subscribe((datos) => {
        // Se conservan los productos activos aunque su precio minorista todavía no esté configurado.
        this.stockItems = (datos || []).filter((producto) => producto.status === 'Activo');
        this.actualizarResultadosBusqueda();
        this.actualizarPreciosCarrito();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((suscripcion) => suscripcion.unsubscribe());
  }

  /** Busca únicamente productos vendibles: activos, con unidades por encima del mínimo. */
  esDisponibleEnPOS(producto: StockItem): boolean {
    const disponible = Number(producto.quantity);
    const minimo = Math.max(0, Number(producto.minThreshold) || 0);
    return producto.status === 'Activo' && Number.isFinite(disponible) && disponible > minimo;
  }

  private normalizar(texto: unknown): string {
    return String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es').replace(/\s+/g, ' ').trim();
  }

  actualizarResultadosBusqueda(): void {
    const palabras = this.normalizar(this.busquedaProducto).split(' ').filter(Boolean);
    this.totalCoincidencias = 0;
    this.indiceBusqueda = 0;
    this.resultadosBusqueda = [];
    if (!palabras.length) return;
    for (const producto of this.stockItems) {
      if (!this.esDisponibleEnPOS(producto)) continue;
      // No se busca por código de barras en esta etapa.
      const texto = this.normalizar([producto.name, producto.code, producto.description].join(' '));
      if (!palabras.every(palabra => texto.includes(palabra))) continue;
      ++this.totalCoincidencias;
      if (this.resultadosBusqueda.length < 12) this.resultadosBusqueda.push(producto);
    }
  }

  onBuscarProducto(valor: string): void {
    this.busquedaProducto = valor;
    this.busquedaActiva = true;
    this.actualizarResultadosBusqueda();
  }

  tecladoBusqueda(evento: KeyboardEvent): void {
    if (evento.key === 'Escape') {
      this.busquedaActiva = false;
      return;
    }
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      const cantidad = this.resultadosBusqueda.length;
      if (!cantidad) return;
      this.indiceBusqueda = (this.indiceBusqueda + (evento.key === 'ArrowDown' ? 1 : -1) + cantidad) % cantidad;
    } else if (evento.key === 'Enter') {
      evento.preventDefault();
      const elegido = this.resultadosBusqueda[this.indiceBusqueda];
      if (elegido && this.getPrecioProducto(elegido) !== null) this.agregarDesdeBusqueda(elegido);
    }
  }

  agregarDesdeBusqueda(producto: StockItem): void {
    if (!this.esDisponibleEnPOS(producto) || this.getPrecioProducto(producto) === null) return;
    this.currentProductId = String(producto.id);
    const longitudAnterior = this.cart.length;
    const cantidadAnterior = this.cart.find(p => p.productId === producto.id)?.qty ?? 0;
    this.addToCart();
    // Si la operación se aceptó, se limpia el texto para buscar el siguiente artículo.
    if (this.cart.length !== longitudAnterior ||
        (this.cart.find(p => p.productId === producto.id)?.qty ?? 0) !== cantidadAnterior) {
      this.busquedaProducto = '';
      this.busquedaActiva = false;
      this.actualizarResultadosBusqueda();
      this.campoBuscar?.nativeElement.focus();
    }
  }

  modificarCantidad(item: CartItem, valor: number): void {
    if (this.enviando) return;
    item.qty = Number(valor);
    item.subtotal = Number.isFinite(item.qty) && item.qty > 0 && item.precioValido
      ? this.redondearImporte(item.qty * item.unitPrice) : 0;
    this.claveOperacion = crypto.randomUUID();
  }

  private cantidadValida(cantidad: number, unidad: string): boolean {
    return Number.isFinite(cantidad) && cantidad > 0 &&
      Math.abs(cantidad * 1000 - Math.round(cantidad * 1000)) < 0.000001 &&
      (!['unidad', 'paquete', 'caja'].includes(unidad || 'unidad') || Number.isInteger(cantidad));
  }

  esTransferencia(): boolean {
    return this.paymentMethod === 'Transferencia' || this.paymentMethod === 'Transferencia bancaria';
  }

  cambiarMedioPago(): void {
    this.acreditacionConfirmada = false;
    this.renovarClaveOperacion();
    if (this.paymentMethod === 'Mercado Pago') this.cargarCobros();
  }

  cargarCobros(): void {
    if (!this.permiteQR()) return;
    this.http.get<any[]>(this.api + '/mp/cobros').subscribe({
      next: (resultado) => this.cobros = resultado,
      error: (error) => console.error('Error al consultar cobros QR:', error)
    });
  }

  verificar(idCobro: number): void {
    this.http.post<any>(this.api + '/mp/verificar', { idCobro }).subscribe({
      next: (respuesta) => {
        this.mensaje = 'Estado: ' + respuesta.estado;
        this.cargarCobros();
        this.stateService.loadInitialData();
      },
      error: (error) => {
        this.mensaje = error.error?.message || 'No se pudo verificar el cobro con Mercado Pago.';
      }
    });
  }

  /** Retorna null si el precio solicitado no existe o no está habilitado. */
  getPrecioProducto(producto: StockItem): number | null {
    const valor = this.tipoVenta === 'minorista'
      ? producto.precioMinorista
      : (producto.precioMayorista ?? producto.price);

    if (valor === null || valor === undefined) return null;
    const precio = Number(valor);
    return Number.isFinite(precio) && precio > 0 ? precio : null;
  }

  cambiarModalidad(nuevaModalidad: TipoVenta): void {
    if (this.enviando || this.tipoVenta === nuevaModalidad) return;
    this.tipoVenta = nuevaModalidad;
    this.claveOperacion = crypto.randomUUID();
    this.actualizarPreciosCarrito();
    // Los totales cambian, pero ninguna venta se registra hasta presionar Cobrar.
  }

  renovarClaveOperacion(): void {
    if (!this.enviando) this.claveOperacion = crypto.randomUUID();
  }

  private redondearImporte(valor: number): number {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
  }

  private actualizarPreciosCarrito(): void {
    this.cart = this.cart.map((articulo) => {
      const producto = this.stockItems.find((p) => p.id === articulo.productId);
      const precio = producto ? this.getPrecioProducto(producto) : null;
      return {
        ...articulo,
        name: producto?.name ?? articulo.name,
        unitPrice: precio ?? 0,
        subtotal: precio === null ? 0 : this.redondearImporte(precio * articulo.qty),
        precioValido: precio !== null
      };
    });
  }

  /** Indica los problemas del carrito antes de permitir el cobro. */
  get advertenciaCarrito(): string {
    for (const articulo of this.cart) {
      const producto = this.stockItems.find((item) => item.id === articulo.productId);
      if (!producto || producto.status !== 'Activo') {
        return 'Hay productos que ya no están activos. Actualizá el carrito.';
      }
      if (!this.esDisponibleEnPOS(producto)) {
        return '«' + articulo.name + '» alcanzó el stock mínimo y ya no está disponible en esta terminal.';
      }
      if (!this.cantidadValida(articulo.qty, producto.unidad || 'unidad')) {
        return 'Revisá la cantidad de «' + articulo.name + '». Debe ser positiva y válida para su unidad de medida.';
      }
      if (this.tipoVenta === 'mayorista' && producto.minimoMayorista && articulo.qty < producto.minimoMayorista) {
        const faltan = this.redondearCantidad(producto.minimoMayorista - articulo.qty);
        return '«' + articulo.name + '» requiere ' + producto.minimoMayorista + ' (' + producto.unidad +
          '). Faltan ' + faltan + '. Agregue cantidad o seleccione venta minorista.';
      }
      if (!articulo.precioValido) {
        return 'Falta configurar el precio ' + this.tipoVenta + ' de «' + articulo.name + '».';
      }
      if (articulo.qty > producto.quantity) {
        return 'El stock de «' + articulo.name + '» es insuficiente para la cantidad elegida.';
      }
    }
    return '';
  }

  addToCart(): void {
    if (this.enviando || !this.currentProductId) return;

    const id = Number(this.currentProductId);
    const producto = this.stockItems.find((item) => item.id === id);
    if (!producto || !this.esDisponibleEnPOS(producto)) {
      alert('El producto ya no está disponible en el POS por estado o stock mínimo.');
      return;
    }

    const cantidad = Number(this.currentQty);
    if (!Number.isFinite(cantidad) || cantidad <= 0 ||
        Math.abs(cantidad * 1000 - Math.round(cantidad * 1000)) > 0.000001) {
      alert('Ingrese una cantidad positiva con hasta tres decimales.');
      return;
    }
    if (['unidad', 'paquete', 'caja'].includes(producto.unidad || 'unidad') && !Number.isInteger(cantidad)) {
      alert('La presentación seleccionada requiere cantidades enteras.');
      return;
    }

    const precio = this.getPrecioProducto(producto);
    if (precio === null) {
      alert('Configure el precio ' + this.tipoVenta + ' de este producto en el catálogo antes de venderlo.');
      return;
    }

    const existente = this.cart.find((item) => item.productId === id);
    const cantidadFinal = this.redondearCantidad(cantidad + (existente?.qty ?? 0));
    if (cantidadFinal > producto.quantity) {
      alert('Stock insuficiente.');
      return;
    }

    if (existente) {
      existente.qty = cantidadFinal;
      existente.unitPrice = precio;
      existente.subtotal = this.redondearImporte(cantidadFinal * precio);
      existente.precioValido = true;
    } else {
      this.cart.push({
        productId: id,
        name: producto.name,
        qty: cantidad,
        unitPrice: precio,
        subtotal: this.redondearImporte(precio * cantidad),
        precioValido: true
      });
    }

    this.currentProductId = '';
    this.currentQty = 1;
    this.claveOperacion = crypto.randomUUID();
  }

  private redondearCantidad(cantidad: number): number {
    return Math.round(cantidad * 1000) / 1000;
  }

  removeFromCart(indice: number): void {
    if (this.enviando) return;
    this.cart.splice(indice, 1);
    this.claveOperacion = crypto.randomUUID();
  }

  getCartSubtotal(): number {
    return this.redondearImporte(this.cart.reduce((total, item) => total + item.subtotal, 0));
  }

  getCartTotal(): number {
    return this.getCartSubtotal();
  }

  checkout(): void {
    if (this.enviando) return;
    if (this.cart.length === 0) {
      alert('El carrito está vacío.');
      return;
    }
    if (this.advertenciaCarrito) {
      alert(this.advertenciaCarrito);
      return;
    }
    if (this.esTransferencia() && !this.acreditacionConfirmada) {
      alert('Confirmá que el dinero se acreditó antes de registrar la transferencia.');
      return;
    }
    if (this.paymentMethod === 'Mercado Pago' && !this.idCaja) {
      alert('Seleccione la caja QR de Mercado Pago.');
      return;
    }

    const total = this.getCartTotal();
    this.enviando = true;
    this.mensaje = '';

    if (this.paymentMethod === 'Mercado Pago') {
      this.http.post<any>(this.api + '/mp/cobros', {
        idCaja: this.idCaja,
        claveOperacion: this.claveOperacion,
        tipoVenta: this.tipoVenta,
        details: this.cart.map((item) => ({ productId: item.productId, quantity: item.qty }))
      }).subscribe({
        next: (respuesta) => {
          this.enviando = false;
          if (respuesta.estado !== 'rechazado') this.cart = [];
          this.claveOperacion = crypto.randomUUID();
          this.mensaje = 'Cobro ' + respuesta.idCobro + ' · ' + respuesta.estado +
            (respuesta.estado === 'pendiente' ? '. Escanee el QR físico de la caja.' : '.');
          this.cargarCobros();
          this.stateService.loadInitialData();
        },
        error: (error) => {
          this.enviando = false;
          this.mensaje = error.error?.message || 'No se pudo iniciar el cobro QR. Consulte su estado antes de reintentar.';
          this.cargarCobros();
          // Conservamos la clave si la respuesta fue incierta: el servidor evita duplicados.
        }
      });
      return;
    }

    this.stateService.saveVenta(
      total,
      this.cart,
      (exito) => {
        this.enviando = false;
        if (exito) {
          this.claveOperacion = crypto.randomUUID();
          this.cart = [];
          this.acreditacionConfirmada = false;
        }
      },
      this.paymentMethod === 'Efectivo' ? 'efectivo' :
        (this.paymentMethod === 'Transferencia bancaria' ? 'transferencia_bancaria' : 'transferencia'),
      this.claveOperacion,
      this.tipoVenta,
      this.acreditacionConfirmada
    );
  }

}
