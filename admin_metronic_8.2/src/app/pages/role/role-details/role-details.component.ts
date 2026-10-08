import { Component, EventEmitter, OnInit, TemplateRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { IRoleModel, RoleService } from 'src/app/_fake/services/role.service';
import moment from 'moment';
import 'moment/locale/es';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { StateService } from '../../state.service';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-role-details',
  templateUrl: './role-details.component.html',
  styleUrls: ['./role-details.component.scss']
})
export class RoleDetailsComponent implements OnInit {

  role$: Observable<IRoleModel>;
  roleId: number;

  datatableConfig: DataTables.Settings = {};

  // Reload emitter inside datatable
  reloadEvent: EventEmitter<boolean> = new EventEmitter();

  // Modal setup
  roleModel: IRoleModel = { id: 0, name: '', permissions: [], users: [] };
  isLoading = false;

  @ViewChild('formModal')
  formModal: TemplateRef<any>;

  modalConfig: NgbModalOptions = {
    modalDialogClass: 'modal-dialog modal-dialog-centered mw-650px',
  };

  constructor(
    private route: ActivatedRoute, 
    private apiService: RoleService,
    private modalService: NgbModal,
    private stateService: StateService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.roleId = +params['id'];
      this.loadRole();

      this.datatableConfig = {
        serverSide: true,
        ajax: (dataTablesParameters: any, callback) => {
          this.apiService.getUsers(this.roleId, dataTablesParameters).subscribe(resp => {
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
              const roleName = row.roles[0]?.name;
              return roleName || '';
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
            title: 'Fecha de Registro', data: 'created_at', render: function (data) {
              return moment(data).format('DD MMM YYYY, hh:mm a');;
            }
          }
        ],
        createdRow: function (row, data, dataIndex) {
          $('td:eq(0)', row).addClass('d-flex align-items-center');
        },
      };
    });
  }

  loadRole() {
    this.role$ = this.apiService.getRole(this.roleId);
  }

  deleteUser(user_id: number) {
    this.apiService.deleteUser(this.roleId, user_id).subscribe(() => {
      this.reloadEvent.emit(true);
      this.loadRole();
      this.cdr.detectChanges();
    });
  }

  openEditModal() {
    this.apiService.getRole(this.roleId).subscribe((role: IRoleModel) => {
      this.roleModel = role;
      if (!this.roleModel.permissions) {
        this.roleModel.permissions = [];
      }
      this.modalService.open(this.formModal, this.modalConfig);
    });
  }

  get permissions() {
    return this.stateService.systemPermissions$.value;
  }

  isActionSelected(permId: number, action: string): boolean {
    if (!this.roleModel || !this.roleModel.permissions) return false;
    const perm: any = this.roleModel.permissions.find((p: any) => p.id === permId);
    if (!perm) return false;
    if (action === 'read') return !!perm.can_read;
    if (action === 'create') return !!perm.can_create;
    if (action === 'update') return !!perm.can_update;
    if (action === 'delete') return !!perm.can_delete;
    return false;
  }

  toggleAction(permObj: any, action: string) {
    if (!this.roleModel.permissions) {
      this.roleModel.permissions = [];
    }
    let perm: any = this.roleModel.permissions.find((p: any) => p.id === permObj.id);
    if (!perm) {
      perm = { id: permObj.id, name: permObj.name, can_read: false, can_create: false, can_update: false, can_delete: false };
      this.roleModel.permissions.push(perm);
    }
    if (action === 'read') perm.can_read = !perm.can_read;
    if (action === 'create') perm.can_create = !perm.can_create;
    if (action === 'update') perm.can_update = !perm.can_update;
    if (action === 'delete') perm.can_delete = !perm.can_delete;
    
    // If all are false, maybe remove it from the list?
    if (!perm.can_read && !perm.can_create && !perm.can_update && !perm.can_delete) {
      const idx = this.roleModel.permissions.findIndex((p: any) => p.id === permObj.id);
      if (idx !== -1) this.roleModel.permissions.splice(idx, 1);
    }
  }

  onSubmit(event: Event, myForm: NgForm) {
    if (myForm && myForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.apiService.updateRole(this.roleId, this.roleModel).subscribe({
      next: () => {
        this.isLoading = false;
        this.modalService.dismissAll();
        this.loadRole();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(error);
        this.isLoading = false;
      }
    });
  }
}
