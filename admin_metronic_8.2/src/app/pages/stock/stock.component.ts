import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { StateService, StockItem } from '../state.service';
import { AuthService } from '../../modules/auth';

@Component({
  selector: 'app-stock',
  templateUrl: './stock.component.html',
  styleUrls: [],
})
export class StockComponent implements OnInit, OnDestroy {
  activeTab: 'stock' | 'movimientos' = 'stock';
  stock: StockItem[] = [];
  movimientos: any[] = [];

  private subscriptions: Subscription[] = [];

  // Movimiento Modal variables
  isMovimientoModalOpen = false;
  movProductId = 0;
  movType: 'Entrada' | 'Salida' | 'Ajuste' = 'Entrada';
  movQuantity = 0;
  movObservations = '';

  constructor(
    private stateService: StateService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) {}

  hasAction(action: 'read' | 'create' | 'update' | 'delete'): boolean {
    return this.authService.hasAction(2, action);
  }

  ngOnInit(): void {
    const stockSub = this.stateService.stock$.subscribe((data) => {
      this.stock = data;
      this.cdr.detectChanges();
    });
    this.subscriptions.push(stockSub);

    const movSub = this.stateService.movimientosStock$.subscribe((data) => {
      this.movimientos = data;
      this.cdr.detectChanges();
    });
    this.subscriptions.push(movSub);
  }

  openMovimientoModal(productId?: number) {
    this.movProductId = productId || (this.stock.length > 0 ? this.stock[0].id : 0);
    this.movType = 'Entrada';
    this.movQuantity = 1;
    this.movObservations = '';
    this.isMovimientoModalOpen = true;
  }

  saveMovimiento() {
    if (this.movProductId <= 0 || this.movQuantity <= 0) {
      alert('Por favor complete todos los campos obligatorios con valores válidos.');
      return;
    }

    const mov = {
      productId: this.movProductId,
      type: this.movType,
      quantity: this.movQuantity,
      observations: this.movObservations
    };

    this.stateService.saveMovimientoStock(mov, (success) => {
      if (success) {
        this.isMovimientoModalOpen = false;
        this.activeTab = 'movimientos';
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}

