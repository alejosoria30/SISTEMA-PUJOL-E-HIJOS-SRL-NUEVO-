import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, timeout, finalize } from 'rxjs';
import { environment } from 'src/environments/environment';

/** Administración presencial: categorías, subcategorías y excepciones de acceso. */
@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <section class="card"><div class="card-body">
    <div *ngIf="mensaje" class="alert" [ngClass]="tipoMensaje === 'error' ? 'alert-danger' : 'alert-success'" role="status">{{ mensaje }}</div>

    <ng-container *ngIf="vista === 'categorias'">
      <h2>Categorías de productos</h2>
      <form class="d-flex gap-2 my-4" (ngSubmit)="guardarCategoria()">
        <input name="nombre" class="form-control" [(ngModel)]="nombre" required maxlength="100" placeholder="Nueva categoría" />
        <button type="submit" class="btn btn-primary" [disabled]="guardando || !nombre.trim()">Crear</button>
      </form>
      <p *ngIf="!categorias.length" class="text-muted">No hay categorías cargadas.</p>
      <div *ngFor="let categoria of categorias" class="d-flex flex-wrap align-items-center gap-3 border-top py-3">
        <input class="form-control flex-grow-1" style="max-width:28rem" [(ngModel)]="categoria.nombre" maxlength="100" [attr.aria-label]="'Nombre de categoría '+categoria.idCategoria" />
        <label class="form-check-label"><input type="checkbox" class="form-check-input me-2" [(ngModel)]="categoria.activa" />Activa</label>
        <button class="btn btn-light" [disabled]="guardando || !categoria.nombre.trim()" (click)="guardarCategoria(categoria)">Guardar</button>
      </div>

      <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-8">
        <h3 class="mb-0">Subcategorías y su categoría principal</h3>
        <span class="text-muted">{{ subcategoriasFiltradas.length }} de {{ subcategorias.length }} subcategorías</span>
      </div>
      <form class="row g-3 my-3" (ngSubmit)="crearSubcategoria()">
        <label class="col-lg-4">Categoría principal
          <select class="form-select" name="principal" [(ngModel)]="principal" required>
            <option [ngValue]="0">Seleccionar categoría</option>
            <option *ngFor="let categoria of categorias" [disabled]="!categoria.activa" [ngValue]="categoria.idCategoria">{{ categoria.nombre }}</option>
          </select>
        </label>
        <label class="col-lg-5">Nueva subcategoría
          <input class="form-control" name="sub" [(ngModel)]="nombreSub" required maxlength="100" placeholder="Ej.: Gaseosas" />
        </label>
        <div class="col-lg-3 align-self-end"><button class="btn btn-primary w-100" [disabled]="guardando || !principal || !nombreSub.trim()">Agregar subcategoría</button></div>
      </form>

      <div class="row g-3 mb-3">
        <label class="col-md-5">Filtrar por categoría
          <select class="form-select" [(ngModel)]="filtroCategoria">
            <option [ngValue]="0">Todas las categorías</option>
            <option *ngFor="let categoria of categorias" [ngValue]="categoria.idCategoria">{{ categoria.nombre }}</option>
          </select>
        </label>
        <label class="col-md-5">Buscar subcategoría
          <input class="form-control" [(ngModel)]="busquedaSubcategoria" placeholder="Buscar por nombre" />
        </label>
      </div>
      <div class="table-responsive">
        <table class="table table-row-dashed align-middle">
          <thead><tr><th>Subcategoría</th><th>Categoría a la que pertenece</th><th>Estado</th><th>Acción</th></tr></thead>
          <tbody>
            <tr *ngFor="let subcategoria of subcategoriasFiltradas; trackBy: identificarSubcategoria">
              <td><input class="form-control" [(ngModel)]="subcategoria.nombre" maxlength="100" [attr.aria-label]="'Subcategoría '+subcategoria.idSubcategoria" /></td>
              <td><select class="form-select" [(ngModel)]="subcategoria.idCategoria" (ngModelChange)="filtroCategoria = 0" [attr.aria-label]="'Categoría de '+subcategoria.nombre">
                <option *ngFor="let categoria of categorias" [ngValue]="categoria.idCategoria" [disabled]="!categoria.activa && categoria.idCategoria !== subcategoria.idCategoria">{{ categoria.nombre }}</option>
              </select></td>
              <td><label class="form-check-label"><input type="checkbox" class="form-check-input me-2" [(ngModel)]="subcategoria.activa" />{{subcategoria.activa ? 'Activa' : 'Inactiva'}}</label></td>
              <td><button class="btn btn-sm btn-light-primary" [disabled]="guardando || !subcategoria.nombre.trim()" (click)="guardarSubcategoria(subcategoria)">Guardar</button></td>
            </tr>
            <tr *ngIf="subcategoriasFiltradas.length === 0"><td colspan="4" class="text-center text-muted py-5">No hay subcategorías para mostrar.</td></tr>
          </tbody>
        </table>
      </div>
      <p class="text-muted fs-7">Si una subcategoría tiene productos asociados, primero hay que reclasificarlos antes de moverla a otra categoría. No se eliminan productos ni ventas.</p>
    </ng-container>

    <ng-container *ngIf="vista === 'accesos'">
      <h2>Accesos por perfil</h2>
      <p class="text-muted">Los permisos se asignan a perfiles. Cada empleado hereda los permisos del perfil que tenga asignado; no existen excepciones individuales.</p>
      <div class="d-flex gap-2 flex-wrap mb-4">
        <a class="btn btn-primary" routerLink="/personal/perfiles">Administrar perfiles y permisos</a>
        <a class="btn btn-light" routerLink="/personal/empleados">Asignar perfiles a empleados</a>
      </div>
      <label for="selector-empleado">Consultar permisos efectivos de un empleado</label>
      <select id="selector-empleado" class="form-select my-3" [(ngModel)]="empleado" (ngModelChange)="cargarPermisos()">
        <option [ngValue]="0">Seleccionar empleado</option>
        <option *ngFor="let usuario of usuarios" [ngValue]="usuario.id">{{usuario.name}} · {{usuario.email}}</option>
      </select>
      <div *ngIf="empleado && perfilesSeleccionados.length" class="mb-3">
        <strong>Perfil asignado: </strong><span class="badge badge-light-primary me-2" *ngFor="let perfil of perfilesSeleccionados">{{perfil.name}}</span>
      </div>
      <p *ngIf="cargandoPermisos" role="status" class="text-muted">Consultando permisos…</p>
      <div *ngIf="empleado && !cargandoPermisos" class="table-responsive">
        <table class="table table-row-dashed align-middle">
          <thead><tr><th>Módulo</th><th *ngFor="let accion of acciones">{{ titulosAcciones[accion] }}</th></tr></thead>
          <tbody>
            <tr *ngFor="let permiso of permisos">
              <td class="fw-semibold">{{ permiso.nombreDashPer }}</td>
              <td *ngFor="let accion of acciones">
                <span [ngClass]="+permiso[accion] ? 'badge badge-light-success' : 'badge badge-light-secondary'">{{ +permiso[accion] ? 'Permitido' : 'No permitido' }}</span>
              </td>
            </tr>
            <tr *ngIf="!permisos.length"><td colspan="5" class="text-center text-muted py-5">No hay permisos disponibles para mostrar.</td></tr>
          </tbody>
        </table>
        <h3 class="mt-8">Actividad registrada</h3>
        <p *ngFor="let evento of actividad">{{ evento.fecha }} · {{ evento.accion }} · {{ evento.referencia }}</p>
        <p *ngIf="!actividad.length" class="text-muted">Sin actividad registrada.</p>
      </div>
    </ng-container>

    <ng-container *ngIf="vista === 'configuracion'">
      <h2>Configuración del sistema</h2>
      <label class="my-4">Zona horaria del comercio<input class="form-control" [(ngModel)]="zona" /></label>
      <button class="btn btn-primary ms-3" [disabled]="guardando" (click)="enviar('configuracion',{zonaHoraria:zona})">Guardar</button>
    </ng-container>

    <ng-container *ngIf="vista === 'mercado-pago'">
      <h2>Mercado Pago</h2><button class="btn btn-primary my-4" [disabled]="guardando" (click)="vincular()">Vincular comercio</button>
      <div *ngFor="let cuenta of cuentas" class="mb-4"><strong>Vendedor {{ cuenta.vendedorExterno }}</strong> · {{ +cuenta.activa ? 'Vinculado' : 'Desvinculado' }}
        <button *ngIf="+cuenta.activa" class="btn btn-sm btn-light ms-3" [disabled]="guardando" (click)="enviar('mp/configuracion',{accion:'desvincular',idCuenta:cuenta.idCuenta})">Desvincular</button>
        <div *ngIf="+cuenta.activa" class="d-flex mt-2"><input #pos class="form-control" placeholder="external_pos_id de Mercado Pago" /><button class="btn btn-light-primary" [disabled]="guardando" (click)="enviar('mp/configuracion',{accion:'caja',idCuenta:cuenta.idCuenta,externa:pos.value})">Asociar caja</button></div>
      </div>
      <div *ngFor="let caja of cajas" class="py-2">Caja {{ caja.externalPosId }} · cuenta {{ caja.idCuenta }} · {{ +caja.activa ? 'Activa' : 'Inactiva' }}
        <button class="btn btn-sm btn-light ms-3" *ngIf="+caja.activa" [disabled]="guardando" (click)="enviar('mp/configuracion',{accion:'desactivarCaja',idCaja:caja.idCaja})">Desactivar</button>
      </div>
    </ng-container>
  </div></section>`
})
export class AdministracionPosComponent implements OnInit, OnDestroy {
  vista = '';
  mensaje = '';
  tipoMensaje: 'error' | 'exito' = 'exito';
  guardando = false;
  cargandoPermisos = false;
  nombre = '';
  nombreSub = '';
  principal = 0;
  filtroCategoria = 0;
  busquedaSubcategoria = '';
  empleado = 0;
  zona = '';
  categorias: any[] = [];
  subcategorias: any[] = [];
  usuarios: any[] = [];
  permisos: any[] = [];
  actividad: any[] = [];
  cuentas: any[] = [];
  cajas: any[] = [];
  acciones = ['visualizar', 'crear', 'modificar', 'anular'];
  titulosAcciones: Record<string, string> = { visualizar: 'Ver', crear: 'Crear', modificar: 'Modificar', anular: 'Anular' };
  private readonly api = environment.apiUrl + '/';
  private consultaPermisos?: Subscription;
  private peticiones = new Subscription();
  private readonly modulosEmpleados = new Set([
    'Catálogo de productos', 'Clasificación de productos', 'Cobros QR', 'Gestionar Stock',
    'Gestionar Ventas', 'Acceder al Dashboard', 'Caja presencial',
    'Ajustar cantidad de stock',
    'Comprobantes presenciales', 'Ver Historial de Ventas'
  ]);

  constructor(private ruta: ActivatedRoute, private http: HttpClient) {}

  ngOnInit(): void {
    this.vista = this.ruta.snapshot.routeConfig?.path || '';
    this.cargar();
    if (this.vista === 'accesos') {
      this.empleado = Number(this.ruta.snapshot.queryParamMap.get('empleado')) || 0;
      this.cargarPermisos();
    }
  }

  ngOnDestroy(): void {
    this.consultaPermisos?.unsubscribe();
    this.peticiones.unsubscribe();
  }

  get subcategoriasFiltradas(): any[] {
    const texto = this.busquedaSubcategoria.trim().toLocaleLowerCase();
    return this.subcategorias.filter(subcategoria =>
      (!this.filtroCategoria || +subcategoria.idCategoria === +this.filtroCategoria)
      && (!texto || subcategoria.nombre.toLocaleLowerCase().includes(texto)));
  }

  identificarSubcategoria(_indice: number, subcategoria: any): number { return subcategoria.idSubcategoria; }

  private informarError(error: any): void {
    this.tipoMensaje = 'error';
    this.mensaje = error?.error?.message || (error?.name === 'TimeoutError'
      ? 'La consulta excedió el tiempo de espera. Verificá que la API esté funcionando.'
      : 'No se pudo completar la operación. Revisá la conexión con el servidor.');
  }

  cargar(): void {
    if (this.vista === 'categorias') {
      this.peticiones.add(this.http.get<any[]>(this.api + 'categorias').pipe(timeout(15000)).subscribe({
        next: registros => this.categorias = registros.map(categoria => ({ ...categoria, idCategoria: +categoria.idCategoria, activa: !!+categoria.activa })),
        error: error => this.informarError(error)
      }));
      this.peticiones.add(this.http.get<any[]>(this.api + 'subcategorias').pipe(timeout(15000)).subscribe({
        next: registros => this.subcategorias = registros.map(subcategoria => ({ ...subcategoria, idCategoria: +subcategoria.idCategoria, activa: !!+subcategoria.activa })),
        error: error => this.informarError(error)
      }));
    }
    if (this.vista === 'accesos') this.peticiones.add(this.http.get<any>(this.api + 'usuarios?length=1000').pipe(timeout(15000)).subscribe({
      next: respuesta => this.usuarios = (respuesta.data || []).filter((usuario: any) => !(usuario.roles || []).some((rol: any) => +rol.id === 1)),
      error: error => this.informarError(error)
    }));
    if (this.vista === 'configuracion') this.peticiones.add(this.http.get<any>(this.api + 'configuracion').subscribe({
      next: respuesta => this.zona = respuesta.zonaHoraria, error: error => this.informarError(error)
    }));
    if (this.vista === 'mercado-pago') this.peticiones.add(this.http.get<any>(this.api + 'mp/configuracion').subscribe({
      next: respuesta => { this.cuentas = respuesta.cuentas || []; this.cajas = respuesta.cajas || []; },
      error: error => this.informarError(error)
    }));
  }

  get perfilesSeleccionados(): any[] {
    const usuario = this.usuarios.find(u => +u.id === +this.empleado);
    return usuario?.roles || [];
  }

  cargarPermisos(): void {
    this.consultaPermisos?.unsubscribe();
    this.permisos = [];
    this.actividad = [];
    if (!this.empleado) { this.cargandoPermisos = false; return; }
    const seleccionado = +this.empleado;
    this.cargandoPermisos = true;
    this.consultaPermisos = this.http.get<Record<string, any>>(this.api + 'accesos-empleado', {
      params: { id: seleccionado.toString() }
    }).pipe(timeout(15000), finalize(() => this.cargandoPermisos = false)).subscribe({
      next: respuesta => {
        if (+this.empleado !== seleccionado) return;
        this.permisos = Object.values(respuesta).filter(permiso => this.modulosEmpleados.has(permiso.nombreDashPer));

      },
      error: error => this.informarError(error)
    });
    this.peticiones.add(this.http.get<any[]>(this.api + 'actividad', {
      params: { id: seleccionado.toString() }
    }).pipe(timeout(15000)).subscribe({
      next: respuesta => { if (+this.empleado === seleccionado) this.actividad = respuesta; },
      error: error => console.error('No se pudo consultar la actividad:', error)
    }));
  }

  guardarCategoria(categoria?: any): void {
    this.enviar('categorias', categoria
      ? { id: categoria.idCategoria, nombre: categoria.nombre.trim(), activa: categoria.activa }
      : { nombre: this.nombre.trim() });
  }

  crearSubcategoria(): void {
    this.enviar('subcategorias', { idCategoria: this.principal, nombre: this.nombreSub.trim() });
  }

  guardarSubcategoria(subcategoria: any): void {
    this.enviar('subcategorias', {
      id: subcategoria.idSubcategoria,
      idCategoria: subcategoria.idCategoria,
      nombre: subcategoria.nombre.trim(),
      activa: subcategoria.activa
    });
  }

  enviar(ruta: string, datos: any): void {
    if (this.guardando) return;
    this.guardando = true;
    this.mensaje = '';
    this.peticiones.add(this.http.post(this.api + ruta, datos).pipe(
      timeout(15000), finalize(() => this.guardando = false)
    ).subscribe({
      next: () => {
        this.tipoMensaje = 'exito';
        this.mensaje = 'Cambios guardados correctamente.';
        this.nombre = '';
        this.nombreSub = '';
        if (this.vista === 'accesos') this.cargarPermisos();
        else this.cargar();
      },
      error: error => this.informarError(error)
    }));
  }

  vincular(): void {
    if (this.guardando) return;
    this.guardando = true;
    this.peticiones.add(this.http.post<any>(this.api + 'mp/configuracion', { accion: 'vincular' })
      .pipe(timeout(15000), finalize(() => this.guardando = false)).subscribe({
        next: respuesta => window.location.assign(respuesta.url),
        error: error => this.informarError(error)
      }));
  }
}
