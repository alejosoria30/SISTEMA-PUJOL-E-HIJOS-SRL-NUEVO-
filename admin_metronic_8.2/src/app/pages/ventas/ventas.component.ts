import { Component, OnInit } from '@angular/core';
import { StateService, Client, Receipt, StockItem } from '../state.service';
import { AuthService } from '../../modules/auth';

interface CartItem {
  productId: number;
  name: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

@Component({
  selector: 'app-ventas',
  templateUrl: './ventas.component.html',
  styleUrls: [],
})
export class VentasComponent implements OnInit {
  clients: Client[] = [];
  receipts: Receipt[] = [];
  stockItems: StockItem[] = [];

  // POS State
  cart: CartItem[] = [];
  selectedClientId = '';
  selectedClient: Client | null = null;
  paymentMethod: 'Efectivo' | 'Transferencia' = 'Efectivo';
  channel: string = 'presencial';

  // Product selection in POS
  currentProductId = '';
  currentQty = 1;

  // Invoice / Receipt Drawer
  showReceiptModal = false;
  activeReceipt: Receipt | null = null;

  // Search receipts history
  searchQueryReceipt = '';

  constructor(private stateService: StateService, private authService: AuthService) {}

  hasAction(action: 'read' | 'create' | 'update' | 'delete'): boolean {
    return this.authService.hasAction(5, action); // 5: Sistema de Ventas
  }

  ngOnInit(): void {
    this.stateService.clients$.subscribe(data => {
      this.clients = data;
      this.updateSelectedClient();
    });
    this.stateService.receipts$.subscribe(data => {
      this.receipts = [...data].reverse(); // Most recent first
    });
    this.stateService.stock$.subscribe(data => {
      // Solo productos que tengan precio > 0 y esten activos (si hay filtro de estado)
      this.stockItems = data.filter(p => p.price > 0);
    });
  }

  onClientChange() {
    this.updateSelectedClient();
  }

  updateSelectedClient() {
    if (this.selectedClientId) {
      const client = this.clients.find(c => c.id === Number(this.selectedClientId));
      this.selectedClient = client ? client : null;
    } else {
      this.selectedClient = null;
    }
  }

  addToCart() {
    if (!this.currentProductId) return;
    const pid = Number(this.currentProductId);
    const product = this.stockItems.find(r => r.id === pid);
    if (!product) return;

    const qty = Number(this.currentQty);
    if (qty <= 0) return;

    if (product.quantity < qty) {
      const confirmSale = confirm(`Solo hay ${product.quantity} unidades en stock de ${product.name}. ¿Desea continuar con la venta vendiendo en negativo o superando el stock?`);
      if (!confirmSale) return;
    }

    const price = product.price;

    // Add to cart
    const existing = this.cart.find(item => item.productId === pid);
    if (existing) {
      existing.qty += qty;
      existing.subtotal = existing.qty * existing.unitPrice;
    } else {
      this.cart.push({
        productId: pid,
        name: product.name,
        qty: qty,
        unitPrice: price,
        subtotal: price * qty
      });
    }

    this.currentProductId = '';
    this.currentQty = 1;
  }

  removeFromCart(index: number) {
    this.cart.splice(index, 1);
  }

  getCartSubtotal(): number {
    return this.cart.reduce((sum, item) => sum + item.subtotal, 0);
  }

  getCartDiscount(): number {
    if (this.selectedClient && this.selectedClient.isVIP) {
      return this.getCartSubtotal() * (this.selectedClient.vipDiscount / 100);
    }
    return 0;
  }

  getCartTotal(): number {
    return this.getCartSubtotal() - this.getCartDiscount();
  }

  checkout() {
    if (this.cart.length === 0) {
      alert('El carrito está vacío.');
      return;
    }

    const total = this.getCartTotal();

    this.stateService.saveVenta(total, this.cart, (success) => {
      if (success) {
        // Find last receipt added or mock it for printing
        const receipts = this.stateService.receipts$.value;
        const added = receipts[receipts.length - 1]; // This is an approximation since we don't return the exact receipt object immediately

        this.printReceipt(added);

        // Reset POS cart
        this.cart = [];
        this.selectedClientId = '';
        this.selectedClient = null;
      }
    });
  }

  printReceipt(receipt: Receipt) {
    this.activeReceipt = receipt;
    this.showReceiptModal = true;
  }

  closeReceiptModal() {
    this.showReceiptModal = false;
    this.activeReceipt = null;
  }

  getFilteredReceipts(): Receipt[] {
    return this.receipts.filter(r => {
      const matchQuery = r.clientName.toLowerCase().includes(this.searchQueryReceipt.toLowerCase()) ||
                          r.method.toLowerCase().includes(this.searchQueryReceipt.toLowerCase()) ||
                          r.details.some(d => d.productName.toLowerCase().includes(this.searchQueryReceipt.toLowerCase()));
      return matchQuery;
    });
  }

  printAction() {
    window.print();
  }
}
