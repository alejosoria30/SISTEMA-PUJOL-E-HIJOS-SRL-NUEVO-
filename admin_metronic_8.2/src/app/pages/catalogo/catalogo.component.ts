import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { StateService, StockItem } from '../state.service';
import { AuthService } from '../../modules/auth';

@Component({
  selector: 'app-catalogo',
  templateUrl: './catalogo.component.html',
  styleUrls: [],
})
export class CatalogoComponent implements OnInit, OnDestroy {
  stock: StockItem[] = [];
  filteredStock: StockItem[] = [];
  
  // Filtros y Vista
  searchTerm: string = '';
  selectedCategory: string = 'Todas';
  viewMode: 'grid' | 'table' = 'grid';
  categories: string[] = ['Todas', 'Gaseosas', 'Aguas', 'Jugos', 'Isotónicas'];

  // Modal Crear / Editar
  isModalOpen: boolean = false;
  isEditing: boolean = false;
  currentItem: StockItem = this.getEmptyItem();

  // Modal Ajuste Rápido de Precio
  isQuickPriceModalOpen: boolean = false;
  quickPriceItem: StockItem | null = null;
  newPriceValue: number = 0;

  private subscriptions: Subscription[] = [];

  constructor(
    private stateService: StateService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) {}

  hasAction(action: 'read' | 'create' | 'update' | 'delete'): boolean {
    return this.authService.hasAction(2, action); // Permiso 2 (Stock / Productos)
  }

  ngOnInit(): void {
    const sub = this.stateService.stock$.subscribe((data) => {
      this.stock = data || [];
      this.applyFilters();
      this.cdr.detectChanges();
    });
    this.subscriptions.push(sub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  getEmptyItem(): StockItem {
    return {
      id: 0,
      code: '',
      name: '',
      description: '',
      price: 0,
      quantity: 0,
      minThreshold: 10,
      status: 'Activo'
    };
  }

  // Filtrado reactivo
  applyFilters(): void {
    let result = [...this.stock];

    if (this.selectedCategory !== 'Todas') {
      result = result.filter(item => this.getCategory(item) === this.selectedCategory);
    }

    if (this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase().trim();
      result = result.filter(item => 
        item.name.toLowerCase().includes(term) || 
        (item.code && item.code.toLowerCase().includes(term)) ||
        (item.description && item.description.toLowerCase().includes(term))
      );
    }

    this.filteredStock = result;
  }

  setCategory(cat: string): void {
    this.selectedCategory = cat;
    this.applyFilters();
  }

  // Detección automática de categoría temática de bebidas
  getCategory(item: StockItem): string {
    const text = (item.name + ' ' + (item.description || '')).toLowerCase();
    if (text.includes('coca') || text.includes('sprite') || text.includes('fanta') || text.includes('pepsi') || text.includes('7up') || text.includes('gaseosa') || text.includes('cola')) {
      return 'Gaseosas';
    }
    if (text.includes('agua') || text.includes('kin') || text.includes('villavicencio') || text.includes('glaciar') || text.includes('mineral') || text.includes('soda')) {
      return 'Aguas';
    }
    if (text.includes('cepita') || text.includes('jugo') || text.includes('baggio') || text.includes('citric') || text.includes('naranja') || text.includes('manzana')) {
      return 'Jugos';
    }
    if (text.includes('powerade') || text.includes('gatorade') || text.includes('monster') || text.includes('speed') || text.includes('red bull') || text.includes('energizante') || text.includes('isotonica')) {
      return 'Isotónicas';
    }
    return 'Gaseosas'; // Default mayorista
  }

  // Color de badge por categoría
  getCategoryBadgeClass(category: string): string {
    switch (category) {
      case 'Gaseosas': return 'badge-light-danger text-danger';
      case 'Aguas': return 'badge-light-info text-info';
      case 'Jugos': return 'badge-light-warning text-warning';
      case 'Isotónicas': return 'badge-light-primary text-primary';
      default: return 'badge-light-secondary text-gray-700';
    }
  }

  // Icono por categoría
  getCategoryIcon(category: string): string {
    switch (category) {
      case 'Gaseosas': return 'flask';
      case 'Aguas': return 'drop';
      case 'Jugos': return 'cup';
      case 'Isotónicas': return 'flash-circle';
      default: return 'cube-2';
    }
  }

  // KPIs
  get totalBeverages(): number {
    return this.stock.length;
  }

  get averagePrice(): number {
    if (this.stock.length === 0) return 0;
    const sum = this.stock.reduce((acc, curr) => acc + (curr.price || 0), 0);
    return sum / this.stock.length;
  }

  get lowStockCount(): number {
    return this.stock.filter(item => item.quantity < item.minThreshold).length;
  }

  get optimalStockCount(): number {
    return this.stock.filter(item => item.quantity >= item.minThreshold).length;
  }

  // Abrir Modal de Creación
  openCreateModal(): void {
    this.isEditing = false;
    this.currentItem = this.getEmptyItem();
    // Generar código sugerido (ej. BEB-00X)
    const nextNum = this.stock.length + 1;
    this.currentItem.code = `BEB-${String(nextNum).padStart(3, '0')}`;
    this.isModalOpen = true;
  }

  // Abrir Modal de Edición
  openEditModal(item: StockItem): void {
    this.isEditing = true;
    this.currentItem = { ...item };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  // Guardar Bebida
  saveItem(): void {
    if (!this.currentItem.name || this.currentItem.name.trim() === '') {
      alert('Debe ingresar el nombre de la bebida.');
      return;
    }
    if (this.currentItem.price < 0) {
      alert('El precio no puede ser negativo.');
      return;
    }

    this.stateService.saveStockItem(this.currentItem);
    this.closeModal();
  }

  // Eliminar Bebida
  deleteItem(item: StockItem): void {
    if (confirm(`¿Confirma eliminar '${item.name}' del catálogo?`)) {
      this.stateService.deleteStockItem(item.id);
    }
  }

  // Modal Rápido de Precio
  openQuickPriceModal(item: StockItem): void {
    this.quickPriceItem = item;
    this.newPriceValue = item.price;
    this.isQuickPriceModalOpen = true;
  }

  closeQuickPriceModal(): void {
    this.isQuickPriceModalOpen = false;
    this.quickPriceItem = null;
  }

  saveQuickPrice(): void {
    if (!this.quickPriceItem || this.newPriceValue < 0) {
      alert('Ingrese un precio válido.');
      return;
    }
    const updated: StockItem = {
      ...this.quickPriceItem,
      price: this.newPriceValue
    };
    this.stateService.saveStockItem(updated);
    this.closeQuickPriceModal();
  }
}
