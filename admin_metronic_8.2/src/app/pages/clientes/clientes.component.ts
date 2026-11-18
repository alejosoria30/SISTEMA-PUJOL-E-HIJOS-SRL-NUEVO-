
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
  Client,
  Order,
  Recipe
} from '../state.service';

import { AuthService } from '../../modules/auth';

@Component({
  selector: 'app-clientes',
  templateUrl: './clientes.component.html',
  styleUrls: [],
})
export class ClientesComponent implements OnInit, OnDestroy {

  // ==========================================
  // DATOS GENERALES
  // ==========================================

  clients: Client[] = [];
  recipes: Recipe[] = [];

  // ==========================================
  // FORMULARIO DE CLIENTES
  // ==========================================

  isModalOpen = false;

  formId = 0;
  formName = '';
  formLastname = '';
  formEmail = '';
  formPhone = '';
  formPoints = 0;
  formIsVIP = false;
  formVIPDiscount = 0;

  // ==========================================
  // DETALLES E HISTORIAL DE COMPRAS
  // ==========================================

  selectedClient: Client | null = null;
  selectedClientOrders: Order[] = [];
  isOffcanvasOpen = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private stateService: StateService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) {}

  // ==========================================
  // PERMISOS DE GESTIÓN DE CLIENTES
  // ==========================================

  hasAction(
    action: 'read' | 'create' | 'update' | 'delete'
  ): boolean {
    return this.authService.hasAction(6, action);
  }

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================

  ngOnInit(): void {

    const clientsSub =
      this.stateService.clients$.subscribe((data) => {
        this.clients = data;
        this.cdr.detectChanges();
      });

    this.subscriptions.push(clientsSub);

    const recipesSub =
      this.stateService.recipes$.subscribe((data) => {
        this.recipes = data;
        this.cdr.detectChanges();
      });

    this.subscriptions.push(recipesSub);
  }

  // ==========================================
  // TEMA VISUAL PUJOL E HIJOS S.R.L.
  // SOPORTE PARA MODO CLARO Y OSCURO
  // ==========================================

  private getAlertTheme() {

    const htmlTheme =
      document.documentElement.getAttribute('data-bs-theme');

    const bodyTheme =
      document.body.getAttribute('data-bs-theme');

    const isDark =
      htmlTheme === 'dark' ||
      bodyTheme === 'dark' ||
      document.body.classList.contains('dark-mode') ||
      document.documentElement.classList.contains('dark-mode');

    return {
      background: isDark ? '#1e1e2d' : '#ffffff',
      color: isDark ? '#f5f5f5' : '#252f4a',
      confirmButtonColor: '#c58b32',
      cancelButtonColor: isDark ? '#41445a' : '#64748b'
    };
  }

  // ==========================================
  // CONSULTAR NOMBRE DEL PRODUCTO
  // ==========================================

  getRecipeName(productId: number): string {

    const recipe = this.recipes.find(
      x => x.id === productId
    );

    return recipe
      ? recipe.name
      : 'Producto Desconocido';
  }

  // ==========================================
  // REGISTRAR NUEVO CLIENTE
  // ==========================================

  openNew(): void {

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

  // ==========================================
  // EDITAR CLIENTE EXISTENTE
  // ==========================================

  editClient(client: Client): void {

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

  // ==========================================
  // ELIMINAR CLIENTE - BAJA LÓGICA
  // ==========================================

  async deleteClient(id: number): Promise<void> {

    // Comprobación de permisos

    if (!this.hasAction('delete')) {

      await Swal.fire({
        title: 'Acceso restringido',
        text: 'No dispone de permisos para dar de baja clientes.',
        icon: 'error',
        confirmButtonText: 'Entendido',
        heightAuto: false,
        ...this.getAlertTheme()
      });

      return;
    }

    // Identificar cliente

<<<<<<< HEAD
    this.stateService.saveClient(client, (success) => {
      if (success) {
        this.isModalOpen = false;
        this.cdr.detectChanges();
      }
    });
=======
    const client = this.clients.find(
      c => c.id === id
    );

    const nombreCliente = client
      ? `${client.name} ${client.lastname}`.trim()
      : 'el cliente seleccionado';

    // Mensaje de confirmación

    const resultado = await Swal.fire({

      title: 'Confirmar baja de cliente',

      text:
        `¿Está seguro de dar de baja a ${nombreCliente}? ` +
        'El cliente dejará de figurar como activo en el sistema.',

      icon: 'warning',
      iconColor: '#d89b38',

      showCancelButton: true,
      showCloseButton: true,

      confirmButtonText: 'Sí, dar de baja',
      cancelButtonText: 'Cancelar',

      reverseButtons: true,
      focusCancel: true,

      width: '450px',
      padding: '2rem',
      heightAuto: false,

      // Configuración del tema
      ...this.getAlertTheme(),

      // Color específico para la acción de baja
      confirmButtonColor: '#dc3545',

      customClass: {
        popup: 'rounded-4 shadow-lg',
        title: 'fw-bold',
        confirmButton: 'fw-semibold px-4 py-2',
        cancelButton: 'fw-semibold px-4 py-2'
      }

    });

    // Cancelar sin modificar datos

    if (!resultado.isConfirmed) {
      return;
    }

    try {

      // Mantener el mecanismo original de baja lógica
      this.stateService.deleteClientLogical(id);

      await Swal.fire({

        title: 'Baja procesada',

        text:
          `Se procesó la baja de ${nombreCliente}.`,

        icon: 'success',
        iconColor: '#16a34a',

        confirmButtonText: 'Aceptar',

        width: '420px',
        padding: '2rem',
        heightAuto: false,

        ...this.getAlertTheme(),

        customClass: {
          popup: 'rounded-4 shadow-lg',
          title: 'fw-bold',
          confirmButton: 'fw-semibold px-4 py-2'
        }

      });

    } catch (error) {

      console.error(
        'Error al dar de baja al cliente:',
        error
      );

      await Swal.fire({

        title: 'No se pudo realizar la baja',

        text:
          'Ocurrió un inconveniente al procesar la operación.',

        icon: 'error',
        confirmButtonText: 'Entendido',
        heightAuto: false,

        ...this.getAlertTheme()

      });
    }
>>>>>>> 475f8c5 (Actualizacion del sistema Pujol: catalogo, categorias, imagenes y mejoras generales)
  }

  // ==========================================
  // GUARDAR O ACTUALIZAR CLIENTE
  // ==========================================

  async save(): Promise<void> {

    const isEditing = this.formId !== 0;

    // ==========================================
    // VALIDACIÓN DE PERMISOS
    // ==========================================

    if (
      !this.hasAction(isEditing ? 'update' : 'create')
    ) {

      await Swal.fire({

        title: 'Acceso restringido',

        text:
          'No dispone de permisos para realizar esta operación.',

        icon: 'error',

        confirmButtonText: 'Entendido',

        heightAuto: false,

        ...this.getAlertTheme()

      });

      return;
    }

    // ==========================================
    // VALIDACIÓN DE CAMPOS OBLIGATORIOS
    // ==========================================

    if (
      !this.formName.trim() ||
      !this.formLastname.trim() ||
      !this.formEmail.trim()
    ) {

      await Swal.fire({

        title: 'Información incompleta',

        text:
          'Complete el nombre, apellido y correo electrónico del cliente.',

        icon: 'info',
        iconColor: '#c58b32',

        confirmButtonText: 'Completar datos',

        width: '420px',
        padding: '2rem',
        heightAuto: false,

        ...this.getAlertTheme(),

        customClass: {
          popup: 'rounded-4 shadow-lg',
          title: 'fw-bold',
          confirmButton: 'fw-semibold px-4'
        }

      });

      return;
    }

    // ==========================================
    // VALIDACIÓN DE CORREO ELECTRÓNICO
    // ==========================================

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(this.formEmail.trim())) {

      await Swal.fire({

        title: 'Correo electrónico inválido',

        text:
          'Ingrese una dirección de correo electrónico válida.',

        icon: 'warning',
        iconColor: '#d89b38',

        confirmButtonText: 'Corregir correo',

        heightAuto: false,

        ...this.getAlertTheme()

      });

      return;
    }

    // ==========================================
    // PREPARACIÓN DE DATOS DEL CLIENTE
    // ==========================================

    const client: Client = {

      id: this.formId,

      name: this.formName.trim(),

      lastname: this.formLastname.trim(),

      email: this.formEmail.trim(),

      phone: this.formPhone,

      points: this.formPoints,

      isVIP: this.formIsVIP,

      vipDiscount: this.formIsVIP
        ? this.formVIPDiscount
        : 0
    };

    // ==========================================
    // GUARDAR INFORMACIÓN
    // ==========================================

    try {

      // Conserva el servicio de guardado original
      this.stateService.saveClient(client);

      // Cierra el formulario
      this.isModalOpen = false;

      // Mensaje de operación procesada
      await Swal.fire({

        title: isEditing
          ? 'Actualización procesada'
          : 'Registro procesado',

        text: isEditing
          ? 'Se procesó la actualización de los datos del cliente.'
          : 'Se procesó el registro del nuevo cliente.',

        icon: 'success',
        iconColor: '#16a34a',

        confirmButtonText: 'Aceptar',

        width: '420px',
        padding: '2rem',
        heightAuto: false,

        ...this.getAlertTheme(),

        customClass: {
          popup: 'rounded-4 shadow-lg',
          title: 'fw-bold',
          confirmButton: 'fw-semibold px-4 py-2'
        }

      });

    } catch (error) {

      console.error(
        'Error al guardar cliente:',
        error
      );

      await Swal.fire({

        title: 'Error al guardar',

        text:
          'No fue posible completar la operación. Intente nuevamente.',

        icon: 'error',

        confirmButtonText: 'Aceptar',

        heightAuto: false,

        ...this.getAlertTheme()

      });
    }
  }

  // ==========================================
  // HISTORIAL DE COMPRAS DEL CLIENTE
  // ==========================================

  viewOrderHistory(client: Client): void {

    this.selectedClient = client;

    const allOrders =
      this.stateService.orders$.value;

    const clientFullName =
      `${client.name} ${client.lastname}`.toLowerCase();

    this.selectedClientOrders = allOrders.filter(
      o =>
        o.clientName.toLowerCase().includes(clientFullName) ||
        clientFullName.includes(o.clientName.toLowerCase())
    );

    this.isOffcanvasOpen = true;
  }

  // ==========================================
  // LIMPIEZA DE SUSCRIPCIONES
  // ==========================================

  ngOnDestroy(): void {

    this.subscriptions.forEach(
      (subscription) => subscription.unsubscribe()
    );
  }
}
