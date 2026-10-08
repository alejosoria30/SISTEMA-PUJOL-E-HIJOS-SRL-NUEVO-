import { AfterViewInit, ChangeDetectorRef, Component, EventEmitter, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { SwalComponent } from '@sweetalert2/ngx-sweetalert2';
import { Observable } from 'rxjs';
import { DataTablesResponse, IUserModel, UserService } from 'src/app/_fake/services/user-service';
import { SweetAlertOptions } from 'sweetalert2';
import moment from 'moment';
import 'moment/locale/es';
import { IRoleModel, RoleService } from 'src/app/_fake/services/role.service';

@Component({
  selector: 'app-user-listing',
  templateUrl: './user-listing.component.html',
  styleUrls: ['./user-listing.component.scss']
})
export class UserListingComponent implements OnInit, AfterViewInit, OnDestroy {

  isCollapsed1 = false;
  isCollapsed2 = true;

  isLoading = false;

  users: DataTablesResponse;

  datatableConfig: DataTables.Settings = {};

  // Reload emitter inside datatable
  reloadEvent: EventEmitter<boolean> = new EventEmitter();

  // Single model
  aUser: Observable<IUserModel>;
  userModel: IUserModel = { id: 0, name: '', email: '', role: '' };

  @ViewChild('noticeSwal')
  noticeSwal!: SwalComponent;

  swalOptions: SweetAlertOptions = {};

  roles$: Observable<DataTablesResponse>;
  currentRoleFilter: string = '';

  constructor(private apiService: UserService, private roleService: RoleService, private cdr: ChangeDetectorRef) { }

  ngAfterViewInit(): void {
  }

  filterRole(event: any) {
    this.currentRoleFilter = event.target.value;
    this.reloadEvent.emit(true);
  }

  ngOnInit(): void {
    this.datatableConfig = {
      serverSide: true,
      ajax: (dataTablesParameters: any, callback) => {
        dataTablesParameters.roleFilter = this.currentRoleFilter;
        this.apiService.getUsers(dataTablesParameters).subscribe(resp => {
          callback(resp);
        });
      },
      columns: [
        {
          title: 'Nombre', data: 'name', render: function (data, type, full) {
            const colorClasses = ['success', 'info', 'warning', 'danger'];
            const randomColorClass = colorClasses[Math.floor(Math.random() * colorClasses.length)];

            const initials = data[0].toUpperCase();
            const symbolLabel = `
              <div class="symbol-label fs-3 bg-light-${randomColorClass} text-${randomColorClass}">
                ${initials}
              </div>
            `;

            const nameAndEmail = `
              <div class="d-flex flex-column" data-action="view" data-id="${full.id}">
                <a href="javascript:;" class="text-gray-800 text-hover-primary mb-1">${data}</a>
                <span>${full.email}</span>
              </div>
            `;

            return `
              <div class="symbol symbol-circle symbol-50px overflow-hidden me-3" data-action="view" data-id="${full.id}">
                <a href="javascript:;">
                  ${symbolLabel}
                </a>
              </div>
              ${nameAndEmail}
            `;
          }
        },
        {
          title: 'Rol', data: 'role', render: function (data, type, row) {
            if (row.roles && row.roles.length > 0) {
              return row.roles.map((r: any) => r.name).join(', ');
            }
            return '';
          },
          orderData: [1],
          orderSequence: ['asc', 'desc'],
          type: 'string',
        },
        {
          title: 'Último Acceso', data: 'last_login_at', render: (data, type, full) => {
            const date = data || full.created_at;
            const dateString = moment(date).locale('es').fromNow();
            return `<div class="badge badge-light fw-bold">${dateString}</div>`;
          }
        },
        {
          title: 'Estado', data: 'status', render: function (data) {
            const statusClass = data === 'Activo' ? 'success' : 'danger';
            return `<div class="badge badge-light-${statusClass} fw-bold">${data || 'Activo'}</div>`;
          }
        },
        {
          title: 'Fecha de Registro', data: 'created_at', render: function (data) {
            return moment(data).format('DD MMM YYYY, hh:mm a');;
          }
        }
      ],
      createdRow: function (row, data, dataIndex) {
        $('td:eq(0)', row).addClass('d-flex align-items-center');
      },
    };

    this.roles$ = this.roleService.getRoles();
  }

  delete(id: number) {
    this.apiService.deleteUser(id).subscribe({
      next: () => {
        this.reloadEvent.emit(true);
      },
      error: (err) => {
        console.error('Error al eliminar usuario:', err);
        this.showAlert({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || 'No se pudo eliminar el usuario.'
        });
      }
    });
  }

  edit(id: number) {
    this.aUser = this.apiService.getUser(id);
    this.aUser.subscribe((user: IUserModel) => {
      this.userModel = user;
      if (!this.userModel.roles) {
        this.userModel.roles = [];
      }
      if (!this.userModel.address) {
        this.userModel.address = {};
      }
      if (!this.userModel.status) {
        this.userModel.status = 'Activo';
      }
    });
  }

  create() {
    this.userModel = { id: 0, name: '', email: '', roles: [], status: 'Activo', address: {} };
  }

  isRoleSelected(roleId: number): boolean {
    if (!this.userModel || !this.userModel.roles) return false;
    return this.userModel.roles.some(r => r.id === roleId);
  }

  toggleRole(roleObj: any) {
    if (!this.userModel.roles) {
      this.userModel.roles = [];
    }
    const idx = this.userModel.roles.findIndex(r => r.id === roleObj.id);
    if (idx !== -1) {
      this.userModel.roles.splice(idx, 1);
    } else {
      this.userModel.roles.push({
        id: roleObj.id,
        name: roleObj.name,
        permissions: roleObj.permissions || [],
        users: []
      });
    }
  }

  onSubmit(event: Event, myForm: NgForm) {
    if (myForm && myForm.invalid) {
      return;
    }

    this.isLoading = true;

    const successAlert: SweetAlertOptions = {
      icon: 'success',
      title: '¡Éxito!',
      text: this.userModel.id > 0 ? '¡Usuario actualizado correctamente!' : '¡Usuario creado correctamente!',
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
      this.apiService.updateUser(this.userModel.id, this.userModel).subscribe({
        next: () => {
          this.showAlert(successAlert);
          this.reloadEvent.emit(true);
        },
        error: (error) => {
          errorAlert.text = this.extractText(error.error);
          this.showAlert(errorAlert);
          this.isLoading = false;
        },
        complete: completeFn,
      });
    };

    const createFn = () => {
      this.userModel.password = 'test123';
      this.apiService.createUser(this.userModel).subscribe({
        next: () => {
          this.showAlert(successAlert);
          this.reloadEvent.emit(true);
        },
        error: (error) => {
          errorAlert.text = this.extractText(error.error);
          this.showAlert(errorAlert);
          this.isLoading = false;
        },
        complete: completeFn,
      });
    };

    if (this.userModel.id > 0) {
      updateFn();
    } else {
      createFn();
    }
  }

  extractText(obj: any): string {
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
    this.reloadEvent.unsubscribe();
  }
}