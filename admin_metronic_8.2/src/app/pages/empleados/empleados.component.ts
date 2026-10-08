import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { StateService } from '../state.service';
import { AuthService } from '../../modules/auth';
import { UserService } from '../../_fake/services/user-service';

export interface LocalEmployee {
  id: number;
  name: string;
  lastname: string;
  role: 'Administrador/Dueño' | 'Empleado' | 'Cliente Web';
  email: string;
  phone: string;
  status: 'Activo' | 'Inactivo';
  permissions?: { ver: boolean; editar: boolean; borrar: boolean };
}

@Component({
  selector: 'app-empleados',
  templateUrl: './empleados.component.html',
  styleUrls: []
})
export class EmpleadosComponent implements OnInit, OnDestroy {
  employees: LocalEmployee[] = [];
  isModalOpen = false;

  // Form fields
  formId = 0;
  formName = '';
  formLastname = '';
  formRole: 'Administrador/Dueño' | 'Empleado' | 'Cliente Web' = 'Empleado';
  formEmail = '';
  formPhone = '';
  formStatus: 'Activo' | 'Inactivo' = 'Activo';
  
  // Extra permissions from mockup (not used in real backend, we use roles)
  formVer = true;
  formEditar = false;
  formBorrar = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private stateService: StateService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private userService: UserService
  ) {}

  hasAction(action: 'read' | 'create' | 'update' | 'delete'): boolean {
    return this.authService.hasAction(7, action); // 7: Administración
  }

  ngOnInit(): void {
    const sub = this.stateService.systemUsers$.subscribe(data => {
      this.employees = data.map((u: any) => {
        let role = 'Cliente Web';
        if (u.roleIds && u.roleIds.includes(1)) role = 'Administrador/Dueño';
        else if (u.roleIds && u.roleIds.includes(2)) role = 'Empleado';
        
        const isVer = true;
        const isEditar = role === 'Administrador/Dueño';
        const isBorrar = role === 'Administrador/Dueño';

        return {
          id: u.id,
          name: u.name,
          lastname: '',
          email: u.email,
          phone: u.phone,
          status: u.status,
          role: role as any,
          permissions: { ver: isVer, editar: isEditar, borrar: isBorrar }
        };
      });
      this.cdr.detectChanges();
    });
    this.subscriptions.push(sub);
    this.stateService.loadUsers();
  }

  openNew() {
    this.formId = 0;
    this.formName = '';
    this.formLastname = '';
    this.formRole = 'Empleado';
    this.formEmail = '';
    this.formPhone = '';
    this.formStatus = 'Activo';
    this.isModalOpen = true;
  }

  editEmployee(emp: LocalEmployee) {
    this.formId = emp.id;
    this.formName = emp.name;
    this.formLastname = emp.lastname;
    this.formRole = emp.role;
    this.formEmail = emp.email;
    this.formPhone = emp.phone;
    this.formStatus = emp.status;
    this.isModalOpen = true;
  }

  deleteLogical(id: number) {
    if (confirm('¿Está seguro de dar de baja a este empleado?')) {
      this.userService.deleteUser(id).subscribe(() => {
        this.stateService.loadUsers();
      });
    }
  }

  save() {
    if (!this.formName || !this.formEmail) {
      alert('Por favor, complete los campos obligatorios (Nombre y Correo).');
      return;
    }

    const roleIds = [];
    if (this.formRole === 'Administrador/Dueño') roleIds.push({ id: 1, name: 'Administrador' });
    else if (this.formRole === 'Empleado') roleIds.push({ id: 2, name: 'Empleado' });
    else roleIds.push({ id: 3, name: 'Cliente' });

    const payload: any = {
      id: this.formId,
      name: this.formName + (this.formLastname ? ' ' + this.formLastname : ''),
      email: this.formEmail,
      phone: this.formPhone,
      status: this.formStatus,
      roles: roleIds,
      username: this.formEmail.split('@')[0],
      password: '',
      address: {},
      dob: ''
    };

    if (this.formId > 0) {
      this.userService.updateUser(this.formId, payload).subscribe(() => {
        this.stateService.loadUsers();
        this.isModalOpen = false;
      });
    } else {
      payload.password = 'Pujol2026!';
      this.userService.createUser(payload).subscribe(() => {
        this.stateService.loadUsers();
        this.isModalOpen = false;
      });
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
