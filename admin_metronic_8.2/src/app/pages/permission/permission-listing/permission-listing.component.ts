import { textoTabla } from 'src/app/texto-tabla';
import { AfterViewInit, ChangeDetectorRef, Component, EventEmitter, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { SwalComponent } from '@sweetalert2/ngx-sweetalert2';
import { Observable } from 'rxjs';
import { DataTablesResponse, IPermissionModel, PermissionService } from 'src/app/_fake/services/permission.service';
import { SweetAlertOptions } from 'sweetalert2';
import moment from 'moment';

@Component({
  selector: 'app-permission-listing',
  templateUrl: './permission-listing.component.html',
  styleUrls: ['./permission-listing.component.scss']
})
export class PermissionListingComponent implements OnInit, AfterViewInit, OnDestroy {

  isCollapsed1 = false;

  isLoading = false;

  mensajeError = '';

  permissions: DataTablesResponse;

  datatableConfig: DataTables.Settings = {};

  // Reload emitter inside datatable
  reloadEvent: EventEmitter<boolean> = new EventEmitter();

  // Single model
  permission$: Observable<IPermissionModel>;
  permissionModel: IPermissionModel = { id: 0, name: '', };

  @ViewChild('noticeSwal')
  noticeSwal!: SwalComponent;

  swalOptions: SweetAlertOptions = {};

  constructor(private apiService: PermissionService, private cdr: ChangeDetectorRef) { }

  ngAfterViewInit(): void {
  }

  ngOnInit(): void {
    this.datatableConfig = {
      serverSide: true,
      ajax: (parametros: any, callback) => {
        this.mensajeError = '';
        this.apiService.getPermissions(parametros).subscribe({
          next: (respuesta) => {
            callback(respuesta);
            this.cdr.detectChanges();
          },
          error: (error) => {
            // DataTables requiere invocar callback incluso si falla la API;
            // de lo contrario conserva el spinner de "Loading..." indefinidamente.
            this.mensajeError = this.describirError(error);
            callback({
              draw: Number(parametros?.draw || 1),
              recordsTotal: 0,
              recordsFiltered: 0,
              data: []
            });
            this.cdr.detectChanges();
          }
        });
      },
      columns: [
        {
          title: 'Nombre', data: 'name',
          render: (data: any, type: any, full: IPermissionModel) => `<a href="javascript:;" data-action="view" data-id="${full.id}" class="text-gray-800 text-hover-primary mb-1">${textoTabla(data)}</a>`
        },
        {
          title: 'Asignado a', data: null, render: function (data, type, row) {
            if (!Array.isArray(data?.roles)) return '';
            return data.roles.map(function (role: any) {
              return `<span class="badge fs-7 m-1 badge-light-info">${textoTabla(role.name)}</span>`;
            }).join('');
          },
          orderData: [1],
          orderSequence: ['asc', 'desc'],
          type: 'string',
        },
        {
          title: 'Fecha de Creación', data: 'created_at', render: function (data) {
            return data ? moment(data).format('DD MMM YYYY, HH:mm') : '—';
          }
        }
      ],
    };
  }

  reintentarCarga(): void {
    this.mensajeError = '';
    this.reloadEvent.emit(true);
  }

  private describirError(error: any): string {
    if (error?.name === 'TimeoutError') {
      return 'La consulta de permisos superó los 15 segundos. Verificá la conexión y los registros del servidor.';
    }
    if (error?.status === 0) {
      return 'No se pudo conectar con la API. Verificá que el servidor PHP esté iniciado y que la URL de la API sea correcta.';
    }
    if (error?.status === 401) return 'Tu sesión venció. Volvé a iniciar sesión.';
    if (error?.status === 403) return 'Tu usuario no tiene autorización para consultar los permisos.';
    if (error?.status === 404) return 'No se encontró la ruta /api/permisos en el servidor.';
    if (error?.status >= 500) {
      return 'La API devolvió un error del servidor (' + error.status + '). Revisá los registros de PHP y la base de datos.';
    }
    return error?.error?.message || 'No se pudieron cargar los permisos. Revisá la conexión con el servidor.';
  }

  delete(id: number) {
    this.apiService.deletePermission(id).subscribe({
      next: () => this.reloadEvent.emit(true),
      error: (error) => this.showAlert({
        icon: 'error', title: 'No se pudo eliminar', text: this.describirError(error)
      })
    });
  }

  edit(id: number) {
    this.permission$ = this.apiService.getPermission(id);
    this.permission$.subscribe({
      next: (permiso: IPermissionModel) => {
        this.permissionModel = permiso;
        this.cdr.detectChanges();
      },
      error: (error) => this.showAlert({
        icon: 'error', title: 'No se pudo cargar el permiso', text: this.describirError(error)
      })
    });
  }

  create() {
    this.permissionModel = { id: 0, name: '', };
  }

  onSubmit(event: Event, myForm: NgForm) {
    if (myForm && myForm.invalid) {
      return;
    }

    if (this.isLoading) return;
    this.isLoading = true;

    const successAlert: SweetAlertOptions = {
      icon: 'success',
      title: '¡Éxito!',
      text: this.permissionModel.id > 0 ? '¡Permiso actualizado correctamente!' : '¡Permiso creado correctamente!',
    };
    const errorAlert: SweetAlertOptions = {
      icon: 'error',
      title: '¡Error!',
      text: '',
    };

    const completeFn = () => {
      this.isLoading = false;
    };

    const updateFn = () => {
      this.apiService.updatePermission(this.permissionModel.id, this.permissionModel).subscribe({
        next: () => {
          this.showAlert(successAlert);
          this.reloadEvent.emit(true);
        },
        error: (error) => {
          errorAlert.text = error?.error?.message || this.describirError(error);
          this.showAlert(errorAlert);
          this.isLoading = false;
        },
        complete: completeFn,
      });
    };

    const createFn = () => {
      this.apiService.createPermission(this.permissionModel).subscribe({
        next: () => {
          this.showAlert(successAlert);
          this.reloadEvent.emit(true);
        },
        error: (error) => {
          errorAlert.text = error?.error?.message || this.describirError(error);
          this.showAlert(errorAlert);
          this.isLoading = false;
        },
        complete: completeFn,
      });
    };

    if (this.permissionModel.id > 0) {
      updateFn();
    } else {
      createFn();
    }
  }

  extractText(obj: any): string {
    if (!obj || typeof obj !== 'object') return '';
    var textArray: string[] = [];

    for (var key in obj) {
      if (typeof obj[key] === 'string') {
        // If the value is a string, add it to the 'textArray'
        textArray.push(obj[key]);
      } else if (typeof obj[key] === 'object') {
        // If the value is an object, recursively call the function and concatenate the results
        textArray = textArray.concat(this.extractText(obj[key]));
      }
    }

    // Use a Set to remove duplicates and convert back to an array
    var uniqueTextArray = Array.from(new Set(textArray));

    // Convert the uniqueTextArray to a single string with line breaks
    var text = uniqueTextArray.join('\n');

    return text;
  }

  showAlert(swalOptions: SweetAlertOptions) {
    let style = swalOptions.icon?.toString() || 'success';
    if (swalOptions.icon === 'error') {
      style = 'danger';
    }
    this.swalOptions = Object.assign({
      buttonsStyling: false,
      confirmButtonText: "Aceptar",
      customClass: {
        confirmButton: "btn btn-" + style
      }
    }, swalOptions);
    this.cdr.detectChanges();
    this.noticeSwal.fire();
  }

  ngOnDestroy(): void {
  }
}
