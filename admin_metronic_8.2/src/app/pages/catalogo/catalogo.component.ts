import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { StateService, StockItem } from '../state.service';
import { AuthService } from '../../modules/auth';

@Component({
  selector: 'app-catalogo',
  templateUrl: './catalogo.component.html',
  styleUrls: ['./catalogo.component.scss'],
})
export class CatalogoComponent implements OnInit, OnDestroy {
  stock: StockItem[] = [];
  filteredStock: StockItem[] = [];
  
  // Filtros y Vista
  // Los tres criterios se combinan: texto + categoría + subcategoría.
  searchTerm: string = '';
  selectedCategory: number | null = null;
  filtroSubcategoria: number | null = null;
  viewMode: 'grid' | 'table' = 'grid';
  categorias: any[] = [];
  subcategorias: any[] = [];
  errorCategorias = '';
  errorSubcategorias = '';

  subcategoriasDe(categoria?: number | null): any[] {
    if (categoria === null || categoria === undefined) return [];
    return this.subcategorias.filter(s => Number(s.idCategoria) === Number(categoria));
  }

  get opcionesSubcategoria(): any[] {
    return this.subcategoriasDe(this.selectedCategory);
  }

  alCambiarCategoria(categoria: number | null): void {
    this.selectedCategory = categoria === null ? null : Number(categoria);
    // No conservar una subcategoría perteneciente a la categoría anterior.
    this.filtroSubcategoria = null;
    this.applyFilters();
  }

  // Coincidencias sin distinción de mayúsculas, tildes ni espacios repetidos.
  private normalizarBusqueda(valor: unknown): string {
    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es')
      .replace(/\s+/g, ' ')
      .trim();
  }

  trackByProducto(_: number, producto: StockItem): number {
    return producto.id;
  }
  filtroEstado='Todos';
  filtroStock='Todos';
  // Cambia la visualización, no elimina productos de los resultados.
  filtroPrecio: 'ambos' | 'mayorista' | 'minorista' = 'ambos';
  vistaPrevia='';
  imagen(item: StockItem): string {
    return item.imagen ? environment.apiUrl+'/fotos/'+item.imagen : './assets/media/logos/pujol-icono.png';
  }
  seleccionarFoto(evento: Event) {
    const archivo=(evento.target as HTMLInputElement).files?.[0];
    if (!archivo) return;
    if (archivo.size>3*1024*1024) {alert('El máximo es 3 MB.');return;}
    const lector=new FileReader();
    lector.onload=()=>{
      this.vistaPrevia=String(lector.result);
      this.currentItem.fotoNueva={nombre:archivo.name,datos:this.vistaPrevia.split(',')[1]};
      this.currentItem.quitarFoto=false;
      this.cdr.detectChanges();
    };
    lector.readAsDataURL(archivo);
  }
  quitarFoto(){
    this.vistaPrevia=''; this.currentItem.imagen=undefined;
    this.currentItem.fotoNueva=undefined; this.currentItem.quitarFoto=true;
  }

  // Modal Crear / Editar
  isModalOpen: boolean = false;
  isEditing: boolean = false;
  currentItem: StockItem = this.getEmptyItem();

  // Modal Ajuste Rápido de Precio
  isQuickPriceModalOpen: boolean = false;
  quickPriceItem: StockItem | null = null;
  newPriceValue: number = 0;
  newMinoristaValue: number | null = null;

  private subscriptions: Subscription[] = [];

  constructor(
    private http: HttpClient,
    private stateService: StateService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) {}

  puedeAjustarStock(): boolean {
    return this.authService.hasPermission('Ajustar cantidad de stock', 'update');
  }

  hasAction(action: 'read' | 'create' | 'update' | 'delete'): boolean {
    return this.authService.hasAction(12, action); // Permiso 2 (Stock / Productos)
  }

  ngOnInit(): void {
    this.http.get<any[]>(environment.apiUrl+'/categorias').subscribe({
      next: lista => {
        this.categorias = Array.isArray(lista) ? lista : [];
        this.errorCategorias = '';
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('No se pudieron cargar las categorías:', err);
        this.errorCategorias = 'No se pudieron cargar las categorías. Actualizá la página para volver a intentar.';
        this.cdr.detectChanges();
      },
    });
    this.http.get<any[]>(environment.apiUrl+'/subcategorias').subscribe({
      next: lista => {
        this.subcategorias = Array.isArray(lista) ? lista : [];
        this.errorSubcategorias = '';
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('No se pudieron cargar las subcategorías:', err);
        this.errorSubcategorias = 'No se pudieron cargar las subcategorías. Actualizá la página para volver a intentar.';
        this.cdr.detectChanges();
      },
    });
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
      precioMayorista: 0,
      precioMinorista: null,
      quantity: 0,
      minThreshold: 10,
      status: 'Activo'
    };
  }

  // Filtrado conjunto, siempre sobre los productos ya cargados en memoria.
  // No se envía una nueva petición a la API con cada pulsación del teclado.
  applyFilters(): void {
    const palabras = this.normalizarBusqueda(this.searchTerm).split(' ').filter(Boolean);
    const categoria = this.selectedCategory;
    const subcategoria = this.filtroSubcategoria;

    this.filteredStock = this.stock.filter(producto => {
      if (categoria !== null && Number(producto.categoriaId) !== categoria) return false;
      if (subcategoria !== null && Number(producto.subcategoriaId) !== subcategoria) return false;

      if (palabras.length) {
        // Se mantiene compatibilidad con búsqueda anterior por descripción y códigos.
        const texto = this.normalizarBusqueda([
          producto.name, producto.code, producto.barras, producto.description
        ].filter(Boolean).join(' '));
        if (!palabras.every(palabra => texto.includes(palabra))) return false;
      }

      if (this.filtroEstado !== 'Todos' && producto.status !== this.filtroEstado) return false;
      if (this.filtroStock === 'Agotado' && producto.quantity > 0) return false;
      if (this.filtroStock === 'Bajo' && !(producto.quantity > 0 && producto.quantity <= producto.minThreshold)) return false;
      if (this.filtroStock === 'Disponible' && producto.quantity <= 0) return false;
      return true;
    });
  }

  limpiarFiltros(): void {
    this.searchTerm = '';
    this.selectedCategory = null;
    this.filtroSubcategoria = null;
    this.filtroEstado = 'Todos';
    this.filtroStock = 'Todos';
    this.filtroPrecio = 'ambos';
    this.applyFilters();
  }

  precioMayorista(item: StockItem): number {
    return item.precioMayorista ?? item.price;
  }

  tienePrecioMinorista(item: StockItem): boolean {
    return Number(item.precioMinorista) > 0;
  }

  actualizarMayoristaEdicion(precio: number | null): void {
    this.currentItem.precioMayorista = precio === null ? 0 : precio;
    this.currentItem.price = this.currentItem.precioMayorista;
  }


  getCategory(item: StockItem) { return item.categoria || 'Sin categoría'; }
  getCategoryBadgeClass(category: string) { return 'badge-light-primary'; }
  getCategoryIcon(category: string) { return 'cube-2'; }
  // KPIs
  get totalProductos(): number {
    return this.stock.length;
  }

  // Alias conservado para no romper otras referencias antiguas.
  get totalBeverages(): number { return this.totalProductos; }

  get averagePrice(): number {
    if (this.stock.length === 0) return 0;
    const sum = this.stock.reduce((acc, curr) => acc + (this.precioMayorista(curr) || 0), 0);
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
    this.vistaPrevia='';
    this.isModalOpen = true;
  }

  // Abrir Modal de Edición
  openEditModal(item: StockItem): void {
    this.isEditing = true;
    this.vistaPrevia='';
    this.currentItem = {
      ...item,
      price: this.precioMayorista(item),
      precioMayorista: this.precioMayorista(item),
      precioMinorista: item.precioMinorista ?? null,
      stockEsperado: item.quantity
    };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  // Guardar un producto con ambos precios, sin romper la API antigua.
  saveItem(): void {
    if (!this.currentItem.name || !this.currentItem.name.trim()) {
      alert('Debe ingresar el nombre del producto.');
      return;
    }
    const mayorista = this.currentItem.precioMayorista ?? this.currentItem.price;
    const minorista = this.normalizarPrecioOpcional(this.currentItem.precioMinorista);
    if (!this.precioValido(mayorista) || (minorista !== null && !this.precioValido(minorista))) {
      alert('Ingrese importes válidos, no negativos y con hasta dos decimales.');
      return;
    }
    const umbral = this.currentItem.minimoMayorista;
    if (umbral != null && (!Number.isFinite(umbral) || umbral <= 0 || umbral > 99999999.999 ||
        Math.abs(umbral*1000 - Math.round(umbral*1000)) > 0.00001 ||
        (['unidad','paquete','caja'].includes((this.currentItem.unidad || 'unidad').trim().toLowerCase()) && !Number.isInteger(umbral)))) {
      alert('Revise el mínimo mayorista. Para unidad, paquete y caja se requiere una cantidad entera positiva.');
      return;
    }
    const actualizado: StockItem = {
      ...this.currentItem,
      price: Number(mayorista),
      precioMayorista: Number(mayorista),
      precioMinorista: minorista,
    };
    this.stateService.saveStockItem(actualizado, () => this.closeModal());
  }

  private normalizarPrecioOpcional(valor: unknown): number | null {
    return valor === null || valor === undefined || valor === '' ? null : Number(valor);
  }

  private precioValido(valor: unknown): boolean {
    if (valor === '' || valor === null || valor === undefined) return false;
    const numero = Number(valor);
    return Number.isFinite(numero) && numero >= 0 && numero <= 99999999.99 &&
      Math.abs(numero * 100 - Math.round(numero * 100)) < 0.00001;
  }

  // Dar de baja un producto (baja lógica)
  deleteItem(item: StockItem): void {
    if (confirm(`¿Confirma eliminar '${item.name}' del catálogo?`)) {
      this.stateService.deleteStockItem(item.id);
    }
  }

  // Modal Rápido de Precio
  openQuickPriceModal(item: StockItem): void {
    this.quickPriceItem = {...item, stockEsperado:item.quantity};
    this.newPriceValue = this.precioMayorista(item);
    this.newMinoristaValue = item.precioMinorista ?? null;
    this.isQuickPriceModalOpen = true;
  }

  closeQuickPriceModal(): void {
    this.isQuickPriceModalOpen = false;
    this.quickPriceItem = null;
  }

  saveQuickPrice(): void {
    const minorista = this.normalizarPrecioOpcional(this.newMinoristaValue);
    if (!this.quickPriceItem || !this.precioValido(this.newPriceValue) ||
        (minorista !== null && !this.precioValido(minorista))) {
      alert('Ingrese precios válidos, no negativos y con hasta dos decimales.');
      return;
    }
    const updated: StockItem = {
      ...this.quickPriceItem,
      price: Number(this.newPriceValue),
      precioMayorista: Number(this.newPriceValue),
      precioMinorista: minorista,
    };
    this.stateService.saveStockItem(updated, () => this.closeQuickPriceModal());
  }
}
