import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { StateService, StockItem, Supplier, compressImage } from '../state.service';
import { AuthService } from '../../modules/auth';

@Component({
  selector: 'app-stock',
  templateUrl: './stock.component.html',
  styleUrls: [],
})
export class StockComponent implements OnInit, OnDestroy {
  activeTab: 'inventario' | 'proveedores' = 'inventario';
  stock: StockItem[] = [];
  suppliers: Supplier[] = [];

  private subscriptions: Subscription[] = [];

  // Item Modal variables
  isItemModalOpen = false;
  itemId = 0;
  itemCode = '';
  itemName = '';
  itemDescription = '';
  itemQuantity = 0;
  itemMinThreshold = 0;
  itemCostPrice = 0;

  // Supplier Modal variables
  isSupplierModalOpen = false;
  supplierId = 0;
  supplierName = '';
  supplierContact = '';
  supplierPhone = '';
  supplierCatalogStr = '';

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

    const supSub = this.stateService.suppliers$.subscribe((data) => {
      this.suppliers = data;
      this.cdr.detectChanges();
    });
    this.subscriptions.push(supSub);
  }

  getSupplierName(supplierId: number): string {
    if (!supplierId || supplierId <= 0) {
      return 'Ninguno';
    }
    const sup = this.suppliers.find((s) => s.id === +supplierId);
    return sup ? sup.name : 'Ninguno';
  }

  // Stock items CRUD
  openNewItem() {
    this.itemId = 0;
    this.itemCode = '';
    this.itemName = '';
    this.itemDescription = '';
    this.itemQuantity = 0;
    this.itemMinThreshold = 0;
    this.itemCostPrice = 0;
    this.isItemModalOpen = true;
  }

  editItem(item: StockItem) {
    this.itemId = item.id;
    this.itemCode = item.code || '';
    this.itemName = item.name;
    this.itemDescription = item.description || '';
    this.itemQuantity = item.quantity;
    this.itemMinThreshold = item.minThreshold;
    this.itemCostPrice = item.price;
    this.isItemModalOpen = true;
  }

  deleteItem(id: number) {
    if (confirm('¿Está seguro de que desea eliminar este artículo?')) {
      this.stateService.deleteStockItem(id);
    }
  }

  onFileChange(event: any) {
    // const file = event.target.files[0];
    // if (file) {
    //   const reader = new FileReader();
    //   reader.onload = (e: any) => {
    //     const base64 = e.target.result;
    //     compressImage(base64).then((compressed: string) => {
    //       // not used in this version
    //     });
    //   };
    //   reader.readAsDataURL(file);
    // }
  }

  saveItem() {
    if (!this.itemName || this.itemQuantity < 0 || this.itemCostPrice < 0) {
      alert('Por favor complete todos los campos obligatorios con valores válidos.');
      return;
    }

    const item: StockItem = {
      id: this.itemId,
      code: this.itemCode,
      name: this.itemName,
      description: this.itemDescription,
      quantity: this.itemQuantity,
      minThreshold: this.itemMinThreshold,
      price: this.itemCostPrice
    };

    this.stateService.saveStockItem(item);
    this.isItemModalOpen = false;
  }

  // Suppliers CRUD
  openNewSupplier() {
    this.supplierId = 0;
    this.supplierName = '';
    this.supplierContact = '';
    this.supplierPhone = '';
    this.supplierCatalogStr = '';
    this.isSupplierModalOpen = true;
  }

  editSupplier(sup: Supplier) {
    this.supplierId = sup.id;
    this.supplierName = sup.name;
    this.supplierContact = sup.contact;
    this.supplierPhone = sup.phone;
    this.supplierCatalogStr = sup.catalog ? sup.catalog.join(', ') : '';
    this.isSupplierModalOpen = true;
  }

  deleteSupplier(id: number) {
    if (confirm('¿Está seguro de que desea eliminar este proveedor?')) {
      this.stateService.deleteSupplier(id);
    }
  }

  saveSupplier() {
    if (!this.supplierName || !this.supplierContact || !this.supplierPhone) {
      alert('Por favor complete todos los campos obligatorios.');
      return;
    }

    const catalog = this.supplierCatalogStr
      ? this.supplierCatalogStr.split(',').map((x) => x.trim()).filter((x) => x !== '')
      : [];

    const sup: Supplier = {
      id: this.supplierId,
      name: this.supplierName,
      contact: this.supplierContact,
      phone: this.supplierPhone,
      catalog: catalog,
    };

    this.stateService.saveSupplier(sup);
    this.isSupplierModalOpen = false;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
