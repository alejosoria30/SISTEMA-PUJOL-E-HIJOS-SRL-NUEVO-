
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

import {
  StateService,
  StockItem,
  compressImage
} from '../state.service';

import { AuthService } from '../../modules/auth';

type CatalogProduct = StockItem & {
  category?: string;
};

@Component({
  selector: 'app-catalogo',
  templateUrl: './catalogo.component.html',
  styleUrls: [],
})
export class CatalogoComponent implements OnInit, OnDestroy {

  // ==========================================
  // DATOS DEL CATÁLOGO
  // ==========================================

  stock: StockItem[] = [];
  filteredStock: StockItem[] = [];

  // ==========================================
  // FILTROS Y VISTAS
  // ==========================================

  searchTerm: string = '';
  selectedCategory: string = 'Todas';

  viewMode: 'grid' | 'table' = 'grid';

  categories: string[] = [
    'Todas',
    'Gaseosas',
    'Aguas',
    'Jugos',
    'Isotónicas',
    'Energizantes',
    'Arroz y Cereales',
    'Fideos y Pastas',
    'Aceites',
    'Conservas',
    'Lácteos',
    'Snacks',
    'Alimentos',
    'Limpieza',
    'Higiene Personal',
    'Otros'
  ];

  // ==========================================
  // MODAL CREAR / EDITAR
  // ==========================================

  isModalOpen: boolean = false;
  isEditing: boolean = false;

  currentItem: CatalogProduct = this.getEmptyItem();

  // ==========================================
  // MODAL DE PRECIO
  // ==========================================

  isQuickPriceModalOpen: boolean = false;
  quickPriceItem: StockItem | null = null;
  newPriceValue: number = 0;

  // ==========================================
  // CONTROL DE IMÁGENES
  // ==========================================

  isProcessingImage: boolean = false;
  private imageSelectionVersion: number = 0;

  private subscriptions: Subscription[] = [];

  constructor(
    private stateService: StateService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) {}

  // ==========================================
  // CONTROL DE PERMISOS
  // ==========================================

  hasAction(
    action: 'read' | 'create' | 'update' | 'delete'
  ): boolean {
    return this.authService.hasAction(2, action);
  }

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================

  ngOnInit(): void {

    const sub = this.stateService.stock$.subscribe(
      (data) => {
        this.stock = data || [];
        this.applyFilters();
        this.cdr.detectChanges();
      }
    );

    this.subscriptions.push(sub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(
      (subscription) => subscription.unsubscribe()
    );
  }

  // ==========================================
  // DISEÑO SWEETALERT2
  // ==========================================

  private getAlertTheme() {

    const backgroundColor = '#1e1e2d';
    const titleColor = '#ffffff';
    const textColor = '#e5e7eb';

    return {
      background: backgroundColor,
      color: titleColor,

      confirmButtonColor: '#c58b32',
      cancelButtonColor: '#50546a',

      heightAuto: false,
      buttonsStyling: true,

      didOpen: () => {

        const title = Swal.getTitle();
        const content = Swal.getHtmlContainer();

        const confirm = Swal.getConfirmButton();
        const cancel = Swal.getCancelButton();

        if (title) {

          title.style.setProperty(
            'color',
            titleColor,
            'important'
          );

          title.style.setProperty(
            'opacity',
            '1',
            'important'
          );

          title.style.setProperty(
            '-webkit-text-fill-color',
            titleColor,
            'important'
          );
        }

        if (content) {

          content.style.setProperty(
            'color',
            textColor,
            'important'
          );

          content.style.setProperty(
            'opacity',
            '1',
            'important'
          );

          content.style.setProperty(
            '-webkit-text-fill-color',
            textColor,
            'important'
          );
        }

        if (confirm) {
          confirm.style.setProperty(
            'color',
            '#ffffff',
            'important'
          );
        }

        if (cancel) {
          cancel.style.setProperty(
            'color',
            '#ffffff',
            'important'
          );
        }
      }
    };
  }

  // ==========================================
  // ADVERTENCIAS
  // ==========================================

  private showWarning(
    title: string,
    message: string
  ): void {

    void Swal.fire({

      ...this.getAlertTheme(),

      title: title,
      text: message,

      icon: 'warning',
      iconColor: '#e5a23c',

      confirmButtonText: 'Entendido',

      width: '450px',
      padding: '2rem',

      customClass: {
        popup: 'rounded-4 shadow-lg',
        title: 'fw-bold',
        confirmButton: 'fw-semibold px-4 py-2'
      }
    });
  }

  // ==========================================
  // PRODUCTO VACÍO
  // ==========================================

  getEmptyItem(): CatalogProduct {

    return {
      id: 0,
      code: '',
      name: '',
      description: '',
      category: 'Otros',
      image: '',
      price: 0,
      quantity: 0,
      minThreshold: 10,
      status: 'Activo'
    };
  }

  // ==========================================
  // FILTROS DEL CATÁLOGO
  // ==========================================

  applyFilters(): void {

    let result = [...this.stock];

    if (this.selectedCategory !== 'Todas') {

      result = result.filter(
        item =>
          this.getCategory(item) === this.selectedCategory
      );
    }

    if (this.searchTerm.trim() !== '') {

      const term = this.searchTerm.toLowerCase().trim();

      result = result.filter(item => {

        const name = (item.name || '').toLowerCase();
        const code = (item.code || '').toLowerCase();

        const description =
          (item.description || '').toLowerCase();

        const category =
          this.getCategory(item).toLowerCase();

        return (
          name.includes(term) ||
          code.includes(term) ||
          description.includes(term) ||
          category.includes(term)
        );
      });
    }

    this.filteredStock = result;
  }

  setCategory(cat: string): void {

    this.selectedCategory = cat;
    this.applyFilters();
  }

  // ==========================================
  // SELECCIONAR CATEGORÍA
  // ==========================================

  setProductCategory(category: string): void {

    if (
      !this.categories.includes(category) ||
      category === 'Todas'
    ) {
      this.currentItem.category = 'Otros';
      return;
    }

    this.currentItem.category = category;
  }

  // ==========================================
  // DETECTAR CATEGORÍA
  // ==========================================

  getCategory(item: StockItem): string {

    const product = item as CatalogProduct;

    const savedCategory =
      typeof product.category === 'string'
        ? product.category.trim()
        : '';

    if (savedCategory) {
      return savedCategory;
    }

    // Compatibilidad con productos antiguos

    const text = (
      (item.name || '') + ' ' +
      (item.description || '')
    ).toLowerCase();

    if (
      text.includes('coca') ||
      text.includes('sprite') ||
      text.includes('fanta') ||
      text.includes('pepsi') ||
      text.includes('7up') ||
      text.includes('gaseosa') ||
      text.includes('cola')
    ) {
      return 'Gaseosas';
    }

    if (
      text.includes('agua') ||
      text.includes('villavicencio') ||
      text.includes('glaciar') ||
      text.includes('mineral') ||
      text.includes('soda')
    ) {
      return 'Aguas';
    }

    if (
      text.includes('cepita') ||
      text.includes('jugo') ||
      text.includes('baggio') ||
      text.includes('citric')
    ) {
      return 'Jugos';
    }

    if (
      text.includes('powerade') ||
      text.includes('gatorade') ||
      text.includes('isotonica') ||
      text.includes('isotónica')
    ) {
      return 'Isotónicas';
    }

    if (
      text.includes('monster') ||
      text.includes('speed') ||
      text.includes('red bull') ||
      text.includes('energizante')
    ) {
      return 'Energizantes';
    }

    if (
      text.includes('arroz') ||
      text.includes('cereal') ||
      text.includes('avena')
    ) {
      return 'Arroz y Cereales';
    }

    if (
      text.includes('fideo') ||
      text.includes('pasta') ||
      text.includes('tallarín') ||
      text.includes('tallarin')
    ) {
      return 'Fideos y Pastas';
    }

    if (text.includes('aceite')) {
      return 'Aceites';
    }

    if (
      text.includes('conserva') ||
      text.includes('atún') ||
      text.includes('atun')
    ) {
      return 'Conservas';
    }

    if (
      text.includes('leche') ||
      text.includes('yogur') ||
      text.includes('queso')
    ) {
      return 'Lácteos';
    }

    if (
      text.includes('papas fritas') ||
      text.includes('snack') ||
      text.includes('galletita')
    ) {
      return 'Snacks';
    }

    if (
      text.includes('detergente') ||
      text.includes('lavandina') ||
      text.includes('limpiador') ||
      text.includes('desinfectante')
    ) {
      return 'Limpieza';
    }

    if (
      text.includes('shampoo') ||
      text.includes('jabón') ||
      text.includes('jabon') ||
      text.includes('desodorante')
    ) {
      return 'Higiene Personal';
    }

    return 'Otros';
  }

  // ==========================================
  // COLORES DE CATEGORÍAS
  // ==========================================

  getCategoryBadgeClass(category: string): string {

    switch (category) {

      case 'Gaseosas':
        return 'badge-light-danger text-danger';

      case 'Aguas':
        return 'badge-light-info text-info';

      case 'Jugos':
        return 'badge-light-warning text-warning';

      case 'Isotónicas':
        return 'badge-light-primary text-primary';

      case 'Energizantes':
        return 'badge-light-danger text-danger';

      case 'Arroz y Cereales':
      case 'Fideos y Pastas':
      case 'Aceites':
      case 'Conservas':
      case 'Alimentos':
        return 'badge-light-warning text-warning';

      case 'Lácteos':
        return 'badge-light-info text-info';

      case 'Snacks':
        return 'badge-light-success text-success';

      case 'Limpieza':
        return 'badge-light-primary text-primary';

      case 'Higiene Personal':
        return 'badge-light-success text-success';

      default:
        return 'badge-light-secondary text-gray-700';
    }
  }

  // ==========================================
  // ICONOS POR CATEGORÍA
  // ==========================================

  getCategoryIcon(category: string): string {

    switch (category) {

      case 'Gaseosas':
        return 'flask';

      case 'Aguas':
        return 'drop';

      case 'Jugos':
      case 'Lácteos':
        return 'cup';

      case 'Isotónicas':
      case 'Energizantes':
        return 'flash-circle';

      default:
        return 'cube-2';
    }
  }

  // ==========================================
  // INDICADORES
  // ==========================================

  get totalBeverages(): number {
    return this.stock.length;
  }

  get totalProducts(): number {
    return this.stock.length;
  }

  get averagePrice(): number {

    if (this.stock.length === 0) {
      return 0;
    }

    const sum = this.stock.reduce(
      (acc, curr) => acc + (curr.price || 0),
      0
    );

    return sum / this.stock.length;
  }

  get lowStockCount(): number {

    return this.stock.filter(
      item => item.quantity < item.minThreshold
    ).length;
  }

  get optimalStockCount(): number {

    return this.stock.filter(
      item => item.quantity >= item.minThreshold
    ).length;
  }

  // ==========================================
  // ABRIR REGISTRO DE PRODUCTO
  // ==========================================

  openCreateModal(): void {

    this.imageSelectionVersion++;
    this.isProcessingImage = false;

    this.isEditing = false;
    this.currentItem = this.getEmptyItem();

    if (this.selectedCategory !== 'Todas') {
      this.currentItem.category = this.selectedCategory;
    }

    const existingCodes = new Set(
      this.stock.map(
        item => (item.code || '').toUpperCase()
      )
    );

    let nextNum = this.stock.length + 1;
    let suggestedCode = '';

    do {

      suggestedCode =
        `PROD-${String(nextNum).padStart(3, '0')}`;

      nextNum++;

    } while (existingCodes.has(suggestedCode));

    this.currentItem.code = suggestedCode;
    this.isModalOpen = true;
  }

  // ==========================================
  // EDITAR PRODUCTO
  // ==========================================

  openEditModal(item: StockItem): void {

    this.imageSelectionVersion++;
    this.isProcessingImage = false;

    this.isEditing = true;

    this.currentItem = {
      ...item,
      category: this.getCategory(item)
    };

    this.isModalOpen = true;
  }

  closeModal(): void {

    this.imageSelectionVersion++;
    this.isProcessingImage = false;

    this.isModalOpen = false;
  }

  // ==========================================
  // GUARDAR PRODUCTO
  // ==========================================

  saveItem(): void {

    // Esperar a que termine la compresión

    if (this.isProcessingImage) {

      this.showWarning(
        'Imagen en procesamiento',
        'La imagen se está preparando. Guardá el producto cuando aparezca la vista previa.'
      );

      return;
    }

    // Validar nombre

    if (
      !this.currentItem.name ||
      !this.currentItem.name.trim()
    ) {

      this.showWarning(
        'Información incompleta',
        'Debe ingresar el nombre del producto.'
      );

      return;
    }

    // Validar categoría

    if (
      !this.currentItem.category ||
      this.currentItem.category === 'Todas' ||
      !this.categories.includes(this.currentItem.category)
    ) {

      this.showWarning(
        'Categoría inválida',
        'Seleccione una categoría válida para el producto.'
      );

      return;
    }

    // Validar precio

    if (
      !Number.isFinite(this.currentItem.price) ||
      this.currentItem.price < 0
    ) {

      this.showWarning(
        'Precio inválido',
        'Ingrese un precio válido mayor o igual a cero.'
      );

      return;
    }

    // Validar stock

    if (
      !Number.isFinite(this.currentItem.quantity) ||
      this.currentItem.quantity < 0 ||
      !Number.isInteger(this.currentItem.quantity)
    ) {

      this.showWarning(
        'Stock inválido',
        'El stock debe ser un número entero mayor o igual a cero.'
      );

      return;
    }

    // Validar stock mínimo

    if (
      !Number.isFinite(this.currentItem.minThreshold) ||
      this.currentItem.minThreshold < 0 ||
      !Number.isInteger(this.currentItem.minThreshold)
    ) {

      this.showWarning(
        'Stock mínimo inválido',
        'El stock mínimo debe ser un número entero mayor o igual a cero.'
      );

      return;
    }

    // Comprobar permisos

    if (
      !this.hasAction(
        this.isEditing ? 'update' : 'create'
      )
    ) {

      this.showWarning(
        'Acceso restringido',
        'No dispone de permisos para guardar este producto.'
      );

      return;
    }

    // Enviar producto e imagen al servicio

    this.stateService.saveStockItem(this.currentItem);
    this.closeModal();
  }

  // ==========================================
  // ELIMINAR PRODUCTO
  // ==========================================

  async deleteItem(item: StockItem): Promise<void> {

    if (!this.hasAction('delete')) {

      this.showWarning(
        'Acceso restringido',
        'No dispone de permisos para eliminar productos.'
      );

      return;
    }

    const resultado = await Swal.fire({

      ...this.getAlertTheme(),

      title: 'Confirmar eliminación',

      text:
        `¿Está seguro de eliminar "${item.name}" ` +
        'del catálogo de productos?',

      icon: 'warning',
      iconColor: '#e5a23c',

      showCancelButton: true,
      showCloseButton: true,

      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',

      reverseButtons: true,
      focusCancel: true,

      width: '460px',
      padding: '2rem',

      confirmButtonColor: '#dc3545',

      customClass: {
        popup: 'rounded-4 shadow-lg',
        title: 'fw-bold',
        confirmButton: 'fw-semibold px-4 py-2',
        cancelButton: 'fw-semibold px-4 py-2'
      }
    });

    if (!resultado.isConfirmed) {
      return;
    }

    this.stateService.deleteStockItem(item.id);
  }

  // ==========================================
  // ABRIR AJUSTE RÁPIDO DE PRECIO
  // ==========================================

  openQuickPriceModal(item: StockItem): void {

    this.quickPriceItem = item;
    this.newPriceValue = item.price;

    this.isQuickPriceModalOpen = true;
  }

  closeQuickPriceModal(): void {

    this.isQuickPriceModalOpen = false;
    this.quickPriceItem = null;
  }

  // ==========================================
  // GUARDAR PRECIO RÁPIDO
  // ==========================================

  saveQuickPrice(): void {

    if (
      !this.quickPriceItem ||
      !Number.isFinite(this.newPriceValue) ||
      this.newPriceValue < 0
    ) {

      this.showWarning(
        'Precio inválido',
        'Ingrese un precio válido para continuar.'
      );

      return;
    }

    if (!this.hasAction('update')) {

      this.showWarning(
        'Acceso restringido',
        'No dispone de permisos para modificar precios.'
      );

      return;
    }

    const updated: StockItem = {
      ...this.quickPriceItem,
      price: this.newPriceValue
    };

    this.stateService.saveStockItem(updated);

    this.closeQuickPriceModal();
  }

  // ==========================================
  // SELECCIONAR IMAGEN DEL PRODUCTO
  // ==========================================

  onProductImageSelected(event: Event): void {

    const input = event.target as HTMLInputElement;

    const file =
      input.files && input.files.length > 0
        ? input.files[0]
        : null;

    if (!file) {
      return;
    }

    // Tipos de archivo permitidos

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.type)) {

      input.value = '';

      this.showWarning(
        'Formato no admitido',
        'Seleccione una imagen JPG, PNG o WebP.'
      );

      return;
    }

    // Tamaño máximo: 2 MB

    const maxSize = 2 * 1024 * 1024;

    if (file.size > maxSize) {

      input.value = '';

      this.showWarning(
        'Imagen demasiado grande',
        'La imagen no debe superar los 2 MB.'
      );

      return;
    }

    // Invalidar lecturas anteriores

    const selection = ++this.imageSelectionVersion;

    this.isProcessingImage = true;

    // Leer imagen seleccionada

    const reader = new FileReader();

    reader.onload = async () => {

      try {

        const original = reader.result;

        if (
          typeof original !== 'string' ||
          !original.startsWith('data:image/')
        ) {
          throw new Error('Imagen inválida');
        }

        // Comprimir imagen antes de enviarla
        // usando la función de StateService.

        const optimized = await compressImage(
          original,
          800,
          800
        );

        // Evitar actualizar un modal ya cerrado

        if (
          selection !== this.imageSelectionVersion ||
          !this.isModalOpen
        ) {
          return;
        }

        // Asignar imagen al producto

        this.currentItem.image = optimized;

        this.isProcessingImage = false;

        // Actualizar vista previa

        this.cdr.detectChanges();

      } catch (error) {

        console.error(
          'Error procesando imagen del producto:',
          error
        );

        if (selection === this.imageSelectionVersion) {

          this.isProcessingImage = false;

          this.showWarning(
            'No se pudo cargar la imagen',
            'Intente seleccionar otra imagen JPG, PNG o WebP.'
          );
        }
      }
    };

    reader.onerror = () => {

      if (selection === this.imageSelectionVersion) {

        this.isProcessingImage = false;

        this.showWarning(
          'Error de lectura',
          'No se pudo abrir la imagen seleccionada.'
        );
      }
    };

    reader.readAsDataURL(file);
  }

  // ==========================================
  // QUITAR IMAGEN DEL PRODUCTO
  // ==========================================

  removeProductImage(): void {

    // Cancelar cualquier lectura pendiente

    this.imageSelectionVersion++;

    this.isProcessingImage = false;

    // Quitar imagen del formulario

    this.currentItem.image = '';

    // Limpiar el selector de archivos

    const input = document.getElementById(
      'pujol-product-image'
    ) as HTMLInputElement | null;

    if (input) {
      input.value = '';
    }

    this.cdr.detectChanges();
  }

  // ==========================================
  // OBTENER IMAGEN DEL PRODUCTO
  // ==========================================

  getProductImage(item: StockItem): string {

    return this.stateService.getProductImage(item);
  }

  // ==========================================
  // MANEJO DE ERROR DE IMÁGENES
  // ==========================================

  onImageError(event: any): void {

    const fallback =
      './assets/media/products/beverages/coca-cola-225.jpg';

    const img = event.target as HTMLImageElement;

    // Evitar bucles de imágenes faltantes

    if (
      !img.src.endsWith(
        '/assets/media/products/beverages/coca-cola-225.jpg'
      )
    ) {
      img.src = fallback;
    }
  }
}
