import { Component, OnInit } from '@angular/core';
import { StateService, Order, Recipe, Client } from '../state.service';
import { AuthService } from '../../modules/auth';

@Component({
  selector: 'app-pedidos',
  templateUrl: './pedidos.component.html',
  styleUrls: [],
})
export class PedidosComponent implements OnInit {
  orders: Order[] = [];
  recipes: Recipe[] = [];
  clients: Client[] = [];

  // Filter and search
  searchTerm = '';
  statusFilter = '';
  channelFilter = '';

  // Form handling
  showForm = false;
  editingOrder: Order | null = null;

  formClientName = '';
  formProductId = 0;
  formQty = 1;
  formCustomNotes = '';
  formDeliveryTime = '';
  formChannel: 'telefónico' | 'presencial' | 'reserva web' = 'presencial';
  formStatus: 'Pendiente' | 'En preparación' | 'Listo' | 'Entregado' | 'Cancelado' = 'Pendiente';

  constructor(private stateService: StateService, private authService: AuthService) {}

  hasAction(action: 'read' | 'create' | 'update' | 'delete'): boolean {
    return this.authService.hasAction(4, action); // 4: Gestión de Pedidos
  }

  ngOnInit(): void {
    this.stateService.orders$.subscribe(data => {
      // Sort orders chronologically by delivery time
      this.orders = [...data].sort((a, b) => new Date(a.deliveryTime).getTime() - new Date(b.deliveryTime).getTime());
    });
    this.stateService.recipes$.subscribe(data => {
      this.recipes = data;
    });
    this.stateService.clients$.subscribe(data => {
      this.clients = data;
    });
  }

  getRecipeName(id: number): string {
    const r = this.recipes.find(item => item.id === id);
    return r ? r.name : 'Desconocido';
  }

  getFilteredOrders(): Order[] {
    return this.orders.filter(o => {
      const matchSearch = o.clientName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                          this.getRecipeName(o.productId).toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                          (o.customNotes && o.customNotes.toLowerCase().includes(this.searchTerm.toLowerCase()));
      const matchStatus = this.statusFilter ? o.status === this.statusFilter : true;
      const matchChannel = this.channelFilter ? o.channel === this.channelFilter : true;
      return matchSearch && matchStatus && matchChannel;
    });
  }

  openNewOrderForm() {
    this.editingOrder = null;
    this.formClientName = '';
    this.formProductId = this.recipes.length > 0 ? this.recipes[0].id : 0;
    this.formQty = 1;
    this.formCustomNotes = '';
    
    // Set default delivery time to tomorrow at 10:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    this.formDeliveryTime = `${yyyy}-${mm}-${dd}T10:00`;
    
    this.formChannel = 'presencial';
    this.formStatus = 'Pendiente';
    this.showForm = true;
  }

  editOrder(order: Order) {
    this.editingOrder = order;
    this.formClientName = order.clientName;
    this.formProductId = order.productId;
    this.formQty = order.qty;
    this.formCustomNotes = order.customNotes;
    this.formDeliveryTime = order.deliveryTime;
    this.formChannel = order.channel;
    this.formStatus = order.status;
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.editingOrder = null;
  }

  saveOrder() {
    if (!this.formClientName || !this.formProductId || !this.formDeliveryTime) {
      alert('Por favor complete los campos obligatorios (Cliente, Producto y Fecha de Entrega)');
      return;
    }

    const orderToSave: Order = {
      id: this.editingOrder ? this.editingOrder.id : 0,
      clientName: this.formClientName,
      productId: Number(this.formProductId),
      qty: Number(this.formQty),
      customNotes: this.formCustomNotes,
      deliveryTime: this.formDeliveryTime,
      channel: this.formChannel,
      status: this.formStatus,
      date: this.editingOrder ? this.editingOrder.date : new Date().toISOString().split('T')[0]
    };

    this.stateService.saveOrder(orderToSave);
    this.closeForm();
  }

  changeStatus(order: Order, newStatus: 'Pendiente' | 'En preparación' | 'Listo' | 'Entregado' | 'Cancelado') {
    const updated = { ...order, status: newStatus };
    this.stateService.saveOrder(updated);
  }

  isUrgent(deliveryTimeStr: string, status: string): boolean {
    if (status === 'Entregado' || status === 'Cancelado') return false;
    
    const delivery = new Date(deliveryTimeStr).getTime();
    const now = new Date().getTime();
    const diffMs = delivery - now;
    const hoursLeft = diffMs / (1000 * 60 * 60);
    
    // Urgent if delivery is within 24 hours (or past due) and not complete
    return hoursLeft <= 24;
  }

  getUrgencyLabel(deliveryTimeStr: string): string {
    const delivery = new Date(deliveryTimeStr).getTime();
    const now = new Date().getTime();
    const diffMs = delivery - now;
    const hoursLeft = diffMs / (1000 * 60 * 60);

    if (hoursLeft < 0) {
      return '¡VENCIDO!';
    } else if (hoursLeft <= 2) {
      return '¡ENTREGA INMEDIATA! (menos de 2h)';
    } else if (hoursLeft <= 6) {
      return 'Urgente (menos de 6h)';
    } else {
      return 'Próximo (menos de 24h)';
    }
  }
}
