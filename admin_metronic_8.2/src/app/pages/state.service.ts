import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Employee {
  id: number;
  name: string;
  lastname: string;
  role: 'Administrador/Dueño' | 'Empleado' | 'Cliente Web';
  email: string;
  phone: string;
  status: 'Activo' | 'Inactivo';
  permissions: {
    ver: boolean;
    editar: boolean;
    borrar: boolean;
  };
}

export interface Supplier {
  id: number;
  name: string;
  contact: string;
  phone: string;
  catalog: string[];
}

export interface StockItem {
  id: number;
  code?: string;
  name: string;
  description?: string;
  price: number;
  status?: string;
  quantity: number;
  minThreshold: number;
}

export interface RecipeIngredient {
  stockId: number;
  quantity: number;
  unit?: string;
  unitWeight?: number;
}

export interface Recipe {
  id: number;
  name: string;
  ingredients: RecipeIngredient[];
  instructions: string;
  marginPercent: number; // Porcentaje de ganancia deseado (ej. 50%)
  image?: string;
}

export interface Order {
  id: number;
  clientName: string;
  productId: number;
  qty: number;
  customNotes: string;
  deliveryTime: string;
  channel: 'telefónico' | 'presencial' | 'reserva web';
  status: 'Pendiente' | 'En preparación' | 'Listo' | 'Entregado' | 'Cancelado';
  date: string;
}

export interface Client {
  id: number;
  name: string;
  lastname: string;
  email: string;
  phone: string;
  points: number;
  isVIP: boolean;
  vipDiscount: number; // Porcentaje de descuento (ej. 10%)
}

export interface Transaction {
  id: number;
  date: string;
  clientName: string;
  total: number;
  method: 'Efectivo' | 'Transferencia';
  status: 'Confirmado' | 'Pendiente de confirmación';
}

export interface Receipt {
  id: number;
  date: string;
  clientName: string;
  details: { productName: string; qty: number; unitPrice: number; subtotal: number }[];
  discount: number;
  total: number;
  method: 'Efectivo' | 'Transferencia';
  channel: string;
}

export interface WeeklyMenu {
  lunes: number[];
  martes: number[];
  miercoles: number[];
  jueves: number[];
  viernes: number[];
  sabado: number[];
  domingo: number[];
}

@Injectable({
  providedIn: 'root',
})
export class StateService {
  private STORAGE_KEY = 'pujol_erp_data';

  // BehaviorSubjects to push updates to subscribers
  public employees$ = new BehaviorSubject<Employee[]>([]);
  public suppliers$ = new BehaviorSubject<Supplier[]>([]);
  public stock$ = new BehaviorSubject<StockItem[]>([]);
  public movimientosStock$ = new BehaviorSubject<any[]>([]);
  public recipes$ = new BehaviorSubject<Recipe[]>([]);
  public clients$ = new BehaviorSubject<Client[]>([]);
  public orders$ = new BehaviorSubject<Order[]>([]);
  public transactions$ = new BehaviorSubject<Transaction[]>([]);
  public receipts$ = new BehaviorSubject<Receipt[]>([]);
  public menu$ = new BehaviorSubject<WeeklyMenu>({
    lunes: [], martes: [], miercoles: [], jueves: [], viernes: [], sabado: [], domingo: []
  });
  public systemUsers$ = new BehaviorSubject<any[]>([]);
  public systemRoles$ = new BehaviorSubject<any[]>([]);
  public systemPermissions$ = new BehaviorSubject<any[]>([]);

  private API_URL = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {
    this.loadInitialData();
  }

  public loadPermissions() {
    this.http.get<any>(`${this.API_URL}/permisos?start=0&length=1000`).subscribe({
      next: (res) => {
        const list = res?.data || [];
        this.systemPermissions$.next(list);
      },
      error: (e) => console.error('Error loading permissions:', e)
    });
  }

  public loadRoles() {
    this.http.get<any>(`${this.API_URL}/roles`).subscribe({
      next: (res) => {
        const list = res?.data || [];
        const mappedRoles = list.map((r: any) => ({
          id: r.id,
          name: r.name,
          permissions: r.permissions || [],
          permissionIds: r.permissions ? r.permissions.map((p: any) => p.id) : []
        }));
        this.systemRoles$.next(mappedRoles);
      },
      error: (e) => console.error('Error loading roles:', e)
    });
  }

  public loadUsers() {
    this.http.get<any>(`${this.API_URL}/usuarios?start=0&length=1000`).subscribe({
      next: (res) => {
        const list = res?.data || [];
        const mappedUsers = list.map((u: any) => ({
          id: u.id,
          name: u.name,
          username: u.email ? u.email.split('@')[0] : '',
          email: u.email,
          roleIds: u.roles ? u.roles.map((r: any) => r.id) : [],
          status: u.status,
          phone: u.phone
        }));
        this.systemUsers$.next(mappedUsers);
      },
      error: (e) => console.error('Error loading users:', e)
    });
  }

  private loadInitialData() {
    // 1. Fetch stock items from database
    this.http.get<StockItem[]>(`${this.API_URL}/productos`).subscribe({
      next: (data) => {
        this.stock$.next(data);
      },
      error: (e) => console.error('Error loading stock items:', e)
    });
    
    this.loadMovimientosStock();

    // 2. Fetch suppliers from database
    this.http.get<Supplier[]>(`${this.API_URL}/proveedores`).subscribe({
      next: (data) => this.suppliers$.next(data),
      error: (e) => console.error('Error loading suppliers:', e)
    });

    // 3. Fetch recipes from database
    this.http.get<Recipe[]>(`${this.API_URL}/recetas`).subscribe({
      next: (data) => {
        this.recipes$.next(data);
      },
      error: (e) => console.error('Error loading recipes:', e)
    });

    this.fetchVentas();
    this.fetchCajaTurno();
    this.fetchComprobantes();

    // 4. Fetch users, roles, permissions from database
    this.loadPermissions();
    this.loadRoles();
    this.loadUsers();

    const dataStr = localStorage.getItem(this.STORAGE_KEY);
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        this.employees$.next(parsed.employees || []);
        this.clients$.next(parsed.clients || []);
        this.orders$.next(parsed.orders || []);
        this.transactions$.next(parsed.transactions || []);
        this.receipts$.next(parsed.receipts || []);
        this.menu$.next(parsed.menu || {
          lunes: [], martes: [], miercoles: [], jueves: [], viernes: [], sabado: [], domingo: []
        });
        return;
      } catch (e) {
        console.error('Error parsing stored data, resetting...', e);
      }
    }

    // Load defaults for other mockup entities not in DB
    const defaultClients: Client[] = [
      { id: 1, name: 'María Belén', lastname: 'Ramos', email: 'belen@example.com', phone: '11223344', points: 350, isVIP: true, vipDiscount: 10 },
      { id: 2, name: 'Juan', lastname: 'Gómez', email: 'juan.gomez@example.com', phone: '55667788', points: 120, isVIP: false, vipDiscount: 0 }
    ];

    const defaultEmployees: Employee[] = [
      { id: 1, name: 'Sean', lastname: 'Stark', role: 'Administrador/Dueño', email: 'admin@demo.com', phone: '123456', status: 'Activo', permissions: { ver: true, editar: true, borrar: true } },
      { id: 2, name: 'Megan', lastname: 'Fox', role: 'Empleado', email: 'user@demo.com', phone: '654321', status: 'Activo', permissions: { ver: true, editar: true, borrar: false } }
    ];

    const defaultMenu: WeeklyMenu = {
      lunes: [], martes: [], miercoles: [], jueves: [], viernes: [], sabado: [], domingo: []
    };

    const defaultOrders: Order[] = [
      { id: 1, clientName: 'María Belén', productId: 1, qty: 36, customNotes: 'Bien dorados y crocantes', deliveryTime: '2026-06-15T10:00', channel: 'telefónico', status: 'Pendiente', date: '2026-06-12' },
      { id: 2, clientName: 'Juan Gómez', productId: 2, qty: 2, customNotes: 'Sin sal extra', deliveryTime: '2026-06-12T18:00', channel: 'presencial', status: 'Entregado', date: '2026-06-11' }
    ];

    const defaultTransactions: Transaction[] = [
      { id: 1, date: '2026-06-11', clientName: 'Juan Gómez', total: 4500, method: 'Efectivo', status: 'Confirmado' },
      { id: 2, date: '2026-06-12', clientName: 'María Belén', total: 12000, method: 'Transferencia', status: 'Pendiente de confirmación' }
    ];

    const defaultReceipts: Receipt[] = [
      {
        id: 1,
        date: '2026-06-11',
        clientName: 'Juan Gómez',
        details: [{ productName: 'Pan de Masa Madre', qty: 2, unitPrice: 2250, subtotal: 4500 }],
        discount: 0,
        total: 4500,
        method: 'Efectivo',
        channel: 'presencial'
      }
    ];

    this.employees$.next(defaultEmployees);
    this.clients$.next(defaultClients);
    this.orders$.next(defaultOrders);
    this.transactions$.next(defaultTransactions);
    this.receipts$.next(defaultReceipts);
    this.menu$.next(defaultMenu);

    this.saveToStorage();
  }

  private saveToStorage() {
    try {
      const data = {
        employees: this.employees$.value,
        clients: this.clients$.value,
        orders: this.orders$.value,
        transactions: this.transactions$.value,
        receipts: this.receipts$.value,
        menu: this.menu$.value
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving data to localStorage (quota exceeded?):', e);
    }
  }

  // --- SYSTEM USERS CRUD ---
  public saveSystemUser(user: any) {
    const list = [...this.systemUsers$.value];
    if (user.id > 0) {
      const idx = list.findIndex(u => u.id === user.id);
      if (idx !== -1) {
        list[idx] = user;
      }
    } else {
      user.id = list.length > 0 ? Math.max(...list.map(u => u.id)) + 1 : 1;
      user.created_at = new Date().toISOString();
      list.push(user);
    }
    this.systemUsers$.next(list);
    this.saveToStorage();
  }

  public deleteSystemUser(id: number) {
    const list = this.systemUsers$.value.filter(u => u.id !== id);
    this.systemUsers$.next(list);
    this.saveToStorage();
  }

  // --- SYSTEM ROLES CRUD ---
  public saveSystemRole(role: any) {
    const list = [...this.systemRoles$.value];
    if (role.id > 0) {
      const idx = list.findIndex(r => r.id === role.id);
      if (idx !== -1) {
        list[idx] = role;
      }
    } else {
      role.id = list.length > 0 ? Math.max(...list.map(r => r.id)) + 1 : 1;
      list.push(role);
    }
    this.systemRoles$.next(list);
    this.saveToStorage();
  }

  public deleteSystemRole(id: number) {
    const list = this.systemRoles$.value.filter(r => r.id !== id);
    this.systemRoles$.next(list);
    this.saveToStorage();
  }

  // --- SYSTEM PERMISSIONS CRUD ---
  public saveSystemPermission(permission: any) {
    const list = [...this.systemPermissions$.value];
    if (permission.id > 0) {
      const idx = list.findIndex(p => p.id === permission.id);
      if (idx !== -1) {
        list[idx] = permission;
      }
    } else {
      permission.id = list.length > 0 ? Math.max(...list.map(p => p.id)) + 1 : 1;
      list.push(permission);
    }
    this.systemPermissions$.next(list);
    this.saveToStorage();
  }

  public deleteSystemPermission(id: number) {
    const list = this.systemPermissions$.value.filter(p => p.id !== id);
    this.systemPermissions$.next(list);
    this.saveToStorage();
  }


  // --- EMPLOYEES CRUD ---
  public saveEmployee(employee: Employee) {
    const list = [...this.employees$.value];
    if (employee.id > 0) {
      const idx = list.findIndex(e => e.id === employee.id);
      if (idx !== -1) list[idx] = employee;
    } else {
      employee.id = list.length > 0 ? Math.max(...list.map(e => e.id)) + 1 : 1;
      list.push(employee);
    }
    this.employees$.next(list);
    this.saveToStorage();
  }

  public deleteEmployeeLogical(id: number) {
    const list = [...this.employees$.value];
    const idx = list.findIndex(e => e.id === id);
    if (idx !== -1) {
      list[idx].status = 'Inactivo'; // Soft Delete
      this.employees$.next(list);
      this.saveToStorage();
    }
  }

  // --- SUPPLIERS CRUD ---
  public saveSupplier(supplier: Supplier) {
    this.http.post<any>(`${this.API_URL}/proveedores`, supplier).subscribe({
      next: (res) => {
        if (res.success) {
          supplier.id = res.id;
          const list = [...this.suppliers$.value];
          const idx = list.findIndex(s => s.id === supplier.id);
          if (idx !== -1) {
            list[idx] = supplier;
          } else {
            list.push(supplier);
          }
          this.suppliers$.next(list);
        }
      },
      error: (e) => {
        console.error('Error saving supplier:', e);
        const errMsg = e.error && e.error.message ? e.error.message : 'Error al guardar el proveedor.';
        alert(errMsg);
      }
    });
  }

  public deleteSupplier(id: number) {
    this.http.delete<any>(`${this.API_URL}/proveedores?id=${id}`).subscribe({
      next: (res) => {
        if (res.success) {
          const list = this.suppliers$.value.filter(s => s.id !== id);
          this.suppliers$.next(list);
        }
      },
      error: (e) => {
        console.error('Error deleting supplier:', e);
        const errMsg = e.error && e.error.message ? e.error.message : 'Error al eliminar el proveedor.';
        alert(errMsg);
      }
    });
  }

  // --- STOCK CRUD ---
  public saveStockItem(item: StockItem) {
    this.http.post<any>(`${this.API_URL}/productos`, item).subscribe({
      next: (res) => {
        if (res.success) {
          item.id = res.id;
          const list = [...this.stock$.value];
          const idx = list.findIndex(s => s.id === item.id);
          if (idx !== -1) {
            list[idx] = item;
          } else {
            list.push(item);
          }
          this.stock$.next(list);
        }
      },
      error: (e) => {
        console.error('Error saving stock item:', e);
        const errMsg = e.error && e.error.message ? e.error.message : 'Error al guardar el insumo.';
        alert(errMsg);
      }
    });
  }

  public deleteStockItem(id: number) {
    this.http.delete<any>(`${this.API_URL}/productos?id=${id}`).subscribe({
      next: (res) => {
        if (res.success) {
          const list = this.stock$.value.filter(s => s.id !== id);
          this.stock$.next(list);
        }
      },
      error: (e) => {
        console.error('Error deleting stock item:', e);
        const errMsg = e.error && e.error.message ? e.error.message : 'Error al eliminar el insumo.';
        alert(errMsg);
      }
    });
  }

  // --- MOVIMIENTOS DE STOCK ---
  public loadMovimientosStock() {
    this.http.get<any[]>(`${this.API_URL}/movimientos-stock`).subscribe({
      next: (data) => this.movimientosStock$.next(data),
      error: (e) => console.error('Error loading movimientos de stock:', e)
    });
  }

  public saveMovimientoStock(movimiento: { productId: number, type: string, quantity: number, observations: string }, callback?: (success: boolean) => void) {
    // We assume userId=1 for now as done in api
    this.http.post<any>(`${this.API_URL}/movimientos-stock`, movimiento).subscribe({
      next: (res) => {
        if (res.success) {
          this.loadMovimientosStock();
          // Reload products stock
          this.http.get<StockItem[]>(`${this.API_URL}/productos`).subscribe({
            next: (data) => this.stock$.next(data)
          });
          if (callback) callback(true);
        } else {
          alert('Error: ' + res.message);
          if (callback) callback(false);
        }
      },
      error: (e) => {
        console.error('Error saving movimiento:', e);
        const errMsg = e.error && e.error.message ? e.error.message : 'Error al registrar el movimiento.';
        alert(errMsg);
        if (callback) callback(false);
      }
    });
  }

  // --- RECIPES CRUD ---
  public saveRecipe(recipe: Recipe) {
    this.http.post<any>(`${this.API_URL}/recetas`, recipe).subscribe({
      next: (res) => {
        if (res.success) {
          recipe.id = res.id;
          if (res.image) {
            recipe.image = `${environment.URL_BACKEND}${res.image}`;
          }
          const list = [...this.recipes$.value];
          const idx = list.findIndex(r => r.id === recipe.id);
          if (idx !== -1) {
            list[idx] = recipe;
          } else {
            list.push(recipe);
          }
          this.recipes$.next(list);
        }
      },
      error: (e) => {
        console.error('Error saving recipe:', e);
        const errMsg = e.error && e.error.message ? e.error.message : 'Error al guardar la receta.';
        alert(errMsg);
      }
    });
  }

  public deleteRecipe(id: number) {
    this.http.delete<any>(`${this.API_URL}/recetas?id=${id}`).subscribe({
      next: (res) => {
        if (res.success) {
          const list = this.recipes$.value.filter(r => r.id !== id);
          this.recipes$.next(list);
        }
      },
      error: (e) => {
        console.error('Error deleting recipe:', e);
        const errMsg = e.error && e.error.message ? e.error.message : 'Error al eliminar la receta.';
        alert(errMsg);
      }
    });
  }

  // --- CLIENTS CRUD ---
  public saveClient(client: Client) {
    const list = [...this.clients$.value];
    if (client.id > 0) {
      const idx = list.findIndex(c => c.id === client.id);
      if (idx !== -1) list[idx] = client;
    } else {
      client.id = list.length > 0 ? Math.max(...list.map(c => c.id)) + 1 : 1;
      list.push(client);
    }
    this.clients$.next(list);
    this.saveToStorage();
  }

  public deleteClientLogical(id: number) {
    const list = [...this.clients$.value];
    const idx = list.findIndex(c => c.id === id);
    if (idx !== -1) {
      // Soft Delete simulation - VIP removed / Points reset, flag deleted
      list.splice(idx, 1); // For client demo CRUD, we can delete or add soft delete status
      this.clients$.next(list);
      this.saveToStorage();
    }
  }

  // --- ORDERS CRUD ---
  public saveOrder(order: Order) {
    const list = [...this.orders$.value];
    if (order.id > 0) {
      const idx = list.findIndex(o => o.id === order.id);
      if (idx !== -1) {
        const oldStatus = list[idx].status;
        list[idx] = order;

        // If order moves to En preparación/Delivered, check if we deduct inventory
        if (order.status === 'En preparación' && oldStatus === 'Pendiente') {
          this.deductIngredientsForRecipe(order.productId, order.qty);
        }
      }
    } else {
      order.id = list.length > 0 ? Math.max(...list.map(o => o.id)) + 1 : 1;
      list.push(order);
    }
    this.orders$.next(list);
    this.saveToStorage();
  }

  // --- MENU SEMANAL ---
  public saveMenu(menu: WeeklyMenu) {
    this.menu$.next(menu);
    this.saveToStorage();
  }

  // --- TRANSACTIONS ---
  public saveTransaction(tx: Transaction) {
    const list = [...this.transactions$.value];
    if (tx.id > 0) {
      const idx = list.findIndex(t => t.id === tx.id);
      if (idx !== -1) list[idx] = tx;
    } else {
      tx.id = list.length > 0 ? Math.max(...list.map(t => t.id)) + 1 : 1;
      list.push(tx);
    }
    this.transactions$.next(list);
    this.saveToStorage();
  }

  // --- RECEIPTS (VENTAS) ---
  public fetchVentas() {
    this.http.get<any[]>(`${this.API_URL}/ventas`).subscribe({
      next: (data) => {
        // Transform data if needed
        const mapped = data.map(v => ({
          id: v.id,
          date: v.date,
          clientName: v.userName || 'Cliente', // Temporarily map user as client
          details: v.details.map((d: any) => ({
            productName: d.productName,
            qty: d.quantity,
            unitPrice: d.price,
            subtotal: d.subtotal
          })),
          total: v.total,
          discount: 0,
          method: 'Efectivo' as any,
          channel: 'Mostrador' as any
        }));
        this.receipts$.next(mapped);
      },
      error: (e) => console.error('Error loading ventas:', e)
    });
  }

  public saveVenta(total: number, cart: any[], callback?: (success: boolean) => void) {
    const payload = {
      total: total,
      idUsu: 1, // Default user
      details: cart.map(item => ({
        productId: item.productId,
        quantity: item.qty,
        price: item.unitPrice
      }))
    };

    this.http.post<any>(`${this.API_URL}/ventas`, payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.fetchVentas(); // Refresh list
          // Trigger stock refresh to reflect deductions
          this.http.get<StockItem[]>(`${this.API_URL}/productos`).subscribe({
            next: (data) => this.stock$.next(data)
          });
          if (callback) callback(true);
        } else {
          alert('Error: ' + res.message);
          if (callback) callback(false);
        }
      },
      error: (e) => {
        console.error('Error saving venta:', e);
        alert('Error al registrar la venta.');
        if (callback) callback(false);
      }
    });
  }
  // --- CAJA ---
  public cajaTurno$ = new BehaviorSubject<any>(null);
  public cajaMovimientos$ = new BehaviorSubject<any[]>([]);
  
  // --- COMPROBANTES ---
  public comprobantes$ = new BehaviorSubject<any[]>([]);

  public fetchComprobantes() {
    this.http.get<any[]>(`${this.API_URL}/comprobantes`).subscribe({
      next: (data) => this.comprobantes$.next(data),
      error: (e) => console.error('Error fetching comprobantes:', e)
    });
  }

  public emitirComprobante(idVenta: number, tipoComp: string, callback?: (success: boolean, numeroComp?: string) => void) {
    this.http.post<any>(`${this.API_URL}/comprobantes`, { idVenta, tipoComp }).subscribe({
      next: (res) => {
        if (res.success) {
          this.fetchComprobantes();
          if (callback) callback(true, res.numeroComp);
        } else {
          alert('Error: ' + res.message);
          if (callback) callback(false);
        }
      },
      error: (e) => {
        console.error('Error emit comprobante:', e);
        if (callback) callback(false);
      }
    });
  }

  public fetchCajaTurno() {
    this.http.get<any>(`${this.API_URL}/caja/turno`).subscribe({
      next: (res) => {
        this.cajaTurno$.next(res.turno);
        if (res.turno) {
          this.fetchCajaMovimientos(res.turno.idTurno);
        } else {
          this.cajaMovimientos$.next([]);
        }
      },
      error: (e) => console.error('Error fetching caja turno:', e)
    });
  }

  public fetchCajaMovimientos(idTurno: number) {
    this.http.get<any[]>(`${this.API_URL}/caja/movimientos?idTurno=${idTurno}`).subscribe({
      next: (data) => this.cajaMovimientos$.next(data),
      error: (e) => console.error('Error fetching caja movs:', e)
    });
  }

  public abrirCaja(montoInicial: number, callback?: (success: boolean) => void) {
    this.http.post<any>(`${this.API_URL}/caja/abrir`, { montoInicial }).subscribe({
      next: (res) => {
        if (res.success) {
          this.fetchCajaTurno();
          if (callback) callback(true);
        } else {
          alert('Error: ' + res.message);
          if (callback) callback(false);
        }
      },
      error: (e) => {
        console.error('Error opening caja:', e);
        if (callback) callback(false);
      }
    });
  }

  public cerrarCaja(idTurno: number, montoFinal: number, diferencia: number, callback?: (success: boolean) => void) {
    this.http.post<any>(`${this.API_URL}/caja/cerrar`, { idTurno, montoFinal, diferencia }).subscribe({
      next: (res) => {
        if (res.success) {
          this.fetchCajaTurno();
          if (callback) callback(true);
        } else {
          alert('Error: ' + res.message);
          if (callback) callback(false);
        }
      },
      error: (e) => {
        console.error('Error closing caja:', e);
        if (callback) callback(false);
      }
    });
  }

  public registrarMovimientoCaja(idTurno: number, tipo: 'Ingreso'|'Egreso', concepto: string, monto: number, callback?: (success: boolean) => void) {
    this.http.post<any>(`${this.API_URL}/caja/movimiento`, { idTurno, tipoMovimiento: tipo, concepto, monto }).subscribe({
      next: (res) => {
        if (res.success) {
          this.fetchCajaTurno(); // Refresh balance and movs
          if (callback) callback(true);
        } else {
          alert('Error: ' + res.message);
          if (callback) callback(false);
        }
      },
      error: (e) => {
        console.error('Error on mov caja:', e);
        if (callback) callback(false);
      }
    });
  }
  // Helper calculation to count recipe base production costs
  public getRecipeCost(recipeId: number): number {
    return 0; // Not used in Pujol e Hijos
  }

  // Deduct inventory ingredients when a production or sale is registered
  public deductIngredientsForRecipe(productId: number, scaleQty: number) {
     // Not used in Pujol e Hijos
  }
}

export function compressImage(base64Str: string, maxWidth = 300, maxHeight = 300): Promise<string> {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith('data:image')) {
      resolve(base64Str);
      return;
    }
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
}
