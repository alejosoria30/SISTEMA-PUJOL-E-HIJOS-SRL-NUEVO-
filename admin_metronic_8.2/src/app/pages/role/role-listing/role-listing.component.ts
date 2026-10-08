import { AfterViewInit, ChangeDetectorRef, Component, EventEmitter, OnDestroy, OnInit, Renderer2, TemplateRef, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { SwalComponent } from '@sweetalert2/ngx-sweetalert2';
import { Observable } from 'rxjs';
import { DataTablesResponse, IRoleModel, RoleService } from 'src/app/_fake/services/role.service';
import { SweetAlertOptions } from 'sweetalert2';
import { StateService } from '../../state.service';

@Component({
  selector: 'app-role-listing',
  templateUrl: './role-listing.component.html',
  styleUrls: ['./role-listing.component.scss']
})
export class RoleListingComponent implements OnInit, AfterViewInit, OnDestroy {

  isCollapsed1 = false;

  isLoading = false;

  roles$: Observable<DataTablesResponse>;

  reloadEvent: EventEmitter<boolean> = new EventEmitter();

  // Single model
  role$: Observable<IRoleModel>;
  roleModel: IRoleModel = { id: 0, name: '', permissions: [], users: [] };

  @ViewChild('formModal')
  formModal: TemplateRef<any>;

  @ViewChild('noticeSwal')
  noticeSwal!: SwalComponent;

  @ViewChild('deleteSwal')
  deleteSwal!: SwalComponent;

  private pendingDeleteId: any = null;

  swalOptions: SweetAlertOptions = {};

  modalConfig: NgbModalOptions = {
    modalDialogClass: 'modal-dialog modal-dialog-centered mw-650px',
  };

  private clickListener: () => void;

  constructor(
    private apiService: RoleService,
    private cdr: ChangeDetectorRef,
    private renderer: Renderer2,
    private modalService: NgbModal,
    private stateService: StateService
  ) { }

  ngAfterViewInit(): void {
    this.clickListener = this.renderer.listen(document, 'click', (event) => {
      const closestBtn = event.target.closest('.btn');
      if (closestBtn) {
        const { action, id } = closestBtn.dataset;

        if (!action) return;

        switch (action) {
          case 'view':
            break;

          case 'create':
            this.create();
            this.modalService.open(this.formModal, this.modalConfig);
            break;

          case 'edit':
            this.edit(id);
            this.modalService.open(this.formModal, this.modalConfig);
            break;

          case 'delete':
            this.pendingDeleteId = id;
            this.deleteSwal.fire();
            break;
        }
      }
    });
  }

  ngOnInit(): void {
    this.roles$ = this.apiService.getRoles();
  }

  delete(id: number) {
    this.pendingDeleteId = id;
    this.deleteSwal.fire();
  }

  confirmDelete() {
    if (!this.pendingDeleteId) return;
    this.apiService.deleteRole(this.pendingDeleteId).subscribe({
      next: () => {
        this.pendingDeleteId = null;
        this.roles$ = this.apiService.getRoles();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.pendingDeleteId = null;
        this.showAlert({
          icon: 'error',
          title: 'No se pudo eliminar',
          text: err?.error?.message || 'Error al eliminar el rol.'
        });
      }
    });
  }

  edit(id: number) {
    this.role$ = this.apiService.getRole(id);
    this.role$.subscribe((role: IRoleModel) => {
      this.roleModel = role;
      if (!this.roleModel.permissions) {
        this.roleModel.permissions = [];
      }
    });
  }

  create() {
    this.roleModel = { id: 0, name: '', permissions: [], users: [] };
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
    
    // If all are false, maybe remove it from the list? (optional)
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

    const successAlert: SweetAlertOptions = {
      icon: 'success',
      title: '¡Éxito!',
      text: this.roleModel.id > 0 ? '¡Rol actualizado correctamente!' : '¡Rol creado correctamente!',
    };
    const errorAlert: SweetAlertOptions = {
      icon: 'error',
      title: '¡Error!',
      text: '',
    };

    const completeFn = () => {
      this.isLoading = false;
      this.modalService.dismissAll();
      this.roles$ = this.apiService.getRoles();
      this.cdr.detectChanges();
    };

    const updateFn = () => {
      this.apiService.updateRole(this.roleModel.id, this.roleModel).subscribe({
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
      this.apiService.createRole(this.roleModel).subscribe({
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

    if (this.roleModel.id > 0) {
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
    if (this.clickListener) {
      this.clickListener();
    }
    this.modalService.dismissAll();
  }
}
