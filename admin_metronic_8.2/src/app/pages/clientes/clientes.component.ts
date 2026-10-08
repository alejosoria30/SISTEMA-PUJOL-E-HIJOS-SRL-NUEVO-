import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { StateService, Client, Order, Recipe } from '../state.service';
import { AuthService } from '../../modules/auth';

@Component({
  selector: 'app-clientes',
  templateUrl: './clientes.component.html',
  styleUrls: [],
})
export class ClientesComponent implements OnInit, OnDestroy {
  clients: Client[] = [];
  recipes: Recipe[] = [];

  // CRUD Form State
  isModalOpen = false;
  formId = 0;
  formName = '';
  formLastname = '';
  formEmail = '';
  formPhone = '';
  formPoints = 0;
  formIsVIP = false;
  formVIPDiscount = 0;

  // Offcanvas / Details state
  selectedClient: Client | null = null;
  selectedClientOrders: Order[] = [];
  isOffcanvasOpen = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private stateService: StateService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) {}

  hasAction(action: 'read' | 'create' | 'update' | 'delete'): boolean {
    // El ID 6 corresponde a "Gestión de Clientes"
    return this.authService.hasAction(6, action);
  }

  ngOnInit(): void {
    const clientsSub = this.stateService.clients$.subscribe((data) => {
      this.clients = data;
      this.cdr.detectChanges();
    });
    this.subscriptions.push(clientsSub);

    const recipesSub = this.stateService.recipes$.subscribe((data) => {
      this.recipes = data;
      this.cdr.detectChanges();
    });
    this.subscriptions.push(recipesSub);
  }

  getRecipeName(productId: number): string {
    const r = this.recipes.find(x => x.id === productId);
    return r ? r.name : 'Producto Desconocido';
  }

  openNew() {
    this.formId = 0;
    this.formName = '';
    this.formLastname = '';
    this.formEmail = '';
    this.formPhone = '';
    this.formPoints = 0;
    this.formIsVIP = false;
    this.formVIPDiscount = 0;
    this.isModalOpen = true;
  }

  editClient(client: Client) {
    this.formId = client.id;
    this.formName = client.name;
    this.formLastname = client.lastname;
    this.formEmail = client.email;
    this.formPhone = client.phone;
    this.formPoints = client.points;
    this.formIsVIP = client.isVIP;
    this.formVIPDiscount = client.vipDiscount;
    this.isModalOpen = true;
  }

  deleteClient(id: number) {
    if (confirm('¿Está seguro de eliminar este cliente?')) {
      this.stateService.deleteClientLogical(id);
    }
  }

  save() {
    if (!this.formName || !this.formLastname || !this.formEmail) {
      alert('Por favor complete los campos obligatorios.');
      return;
    }

    const client: Client = {
      id: this.formId,
      name: this.formName,
      lastname: this.formLastname,
      email: this.formEmail,
      phone: this.formPhone,
      points: this.formPoints,
      isVIP: this.formIsVIP,
      vipDiscount: this.formIsVIP ? this.formVIPDiscount : 0,
    };

    this.stateService.saveClient(client);
    this.isModalOpen = false;
  }

  viewOrderHistory(client: Client) {
    this.selectedClient = client;
    const allOrders = this.stateService.orders$.value;
    const clientFullName = `${client.name} ${client.lastname}`.toLowerCase();
    
    this.selectedClientOrders = allOrders.filter(o => 
      o.clientName.toLowerCase().includes(clientFullName) ||
      clientFullName.includes(o.clientName.toLowerCase())
    );
    this.isOffcanvasOpen = true;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }
}
