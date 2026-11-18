import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';

import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

import { Subscription } from 'rxjs';
import { StateService, StockItem } from '../state.service';
import { AuthService } from '../../modules/auth';

@Component({
  selector: 'app-stock',
  templateUrl: './stock.component.html',
  styleUrls: [],
})
export class StockComponent implements OnInit, OnDestroy {

  // ==========================================
  // PESTAÑAS
  // ==========================================

  activeTab: 'stock' | 'movimientos' = 'stock';

  // ==========================================
  // DATOS
  // ==========================================

  stock: StockItem[] = [];
  movimientos: any[] = [];

  private subscriptions: Subscription[] = [];

  // ==========================================
  // MODAL DE MOVIMIENTOS
  // ==========================================

  isMovimientoModalOpen = false;

  movProductId = 0;

  movType: 'Entrada' | 'Salida' | 'Ajuste' = 'Entrada';

  movQuantity = 0;

  movObservations = '';

  // ==========================================
  // IMAGEN ALTERNATIVA
  // ==========================================

  private readonly defaultProductImage =
    './assets/media/logos/pujol-icono.png';

  // ==========================================
  // CONSTRUCTOR
  // ==========================================

  constructor(
    private router: Router,
    private stateService: StateService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) {}

  // ==========================================
  // PERMISOS
  // ==========================================

  hasAction(
    action: 'read' | 'create' | 'update' | 'delete'
  ): boolean {
    return this.authService.hasAction(2, action);
  }

  puedeAjustarStock(): boolean {
    return this.authService.hasPermission('Ajustar cantidad de stock', 'update');
  }

  puedeRegistrarMovimiento(): boolean {
    return this.hasAction('create') || this.puedeAjustarStock();
  }

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================

  ngOnInit(): void {
    if (this.router.url.split('?')[0] === '/movimientos-stock') this.activeTab='movimientos';

    const stockSub = this.stateService.stock$.subscribe(
      (data) => {
        this.stock = data;
        this.cdr.detectChanges();
      }
    );

    this.subscriptions.push(stockSub);

    const movSub =
      this.stateService.movimientosStock$.subscribe(
        (data) => {
          this.movimientos = data;
          this.cdr.detectChanges();
        }
      );

    this.subscriptions.push(movSub);
  }

  // ==========================================
  // OBTENER IMAGEN DEL PRODUCTO
  // ==========================================

  getProductImage(item: any): string {
    return item?.imagen ? environment.apiUrl+'/fotos/'+item.imagen : this.defaultProductImage;
  }

  onImageError(event: Event): void {

    const image =
      event.target as HTMLImageElement | null;

    if (!image) {
      return;
    }

    // Evita un bucle si falla también
    // la imagen alternativa.
    if (image.dataset['fallbackApplied'] === 'true') {
      image.onerror = null;
      return;
    }

    image.dataset['fallbackApplied'] = 'true';
    image.src = this.defaultProductImage;
  }

  // ==========================================
  // ABRIR MODAL
  // ==========================================

  openMovimientoModal(productId?: number): void {

    this.movProductId =
      productId ||
      (
        this.stock.length > 0
          ? this.stock[0].id
          : 0
      );

    if (!this.puedeRegistrarMovimiento()) return;
    this.movType = this.hasAction('create') ? 'Entrada' : 'Ajuste';
    this.movQuantity = this.movType === 'Ajuste' ? 0 : 1;
    this.movObservations = '';
    this.isMovimientoModalOpen = true;
  }

  // ==========================================
  // GUARDAR MOVIMIENTO
  // ==========================================

  saveMovimiento(): void {

    if (
      this.movProductId <= 0 ||
      (this.movType === 'Ajuste' ? this.movQuantity < 0 : this.movQuantity <= 0) ||
      !Number.isFinite(this.movQuantity)
    ) {
      alert(
        'Por favor complete todos los campos obligatorios con valores válidos.'
      );
      return;
    }

    if (this.movType === 'Ajuste' && !this.puedeAjustarStock()) {
      alert('Tu perfil no permite ajustar las cantidades de stock.');
      return;
    }
    if (this.movType !== 'Ajuste' && !this.hasAction('create')) {
      alert('Tu perfil no permite registrar entradas o salidas.');
      return;
    }
    if (this.movType === 'Ajuste' && !this.movObservations.trim()) {
      alert('Indique el motivo del ajuste de inventario.');
      return;
    }
    const mov = {
      productId: this.movProductId,
      type: this.movType,
      quantity: this.movQuantity,
      observations: this.movObservations
    };

    this.stateService.saveMovimientoStock(
      mov,
      (success) => {

        if (success) {
          this.isMovimientoModalOpen = false;
          this.activeTab = 'movimientos';
          this.cdr.detectChanges();
        }

      }
    );
  }

  // ==========================================
  // LIMPIEZA
  // ==========================================

  ngOnDestroy(): void {

    this.subscriptions.forEach(
      (sub) => sub.unsubscribe()
    );

  }
}
