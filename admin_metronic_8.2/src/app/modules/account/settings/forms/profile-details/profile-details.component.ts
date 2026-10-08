import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { AuthService } from 'src/app/modules/auth';
import { StateService } from 'src/app/pages/state.service';
import { ToastrService } from 'ngx-toastr';
import { UserService } from 'src/app/_fake/services/user-service';

@Component({
  selector: 'app-profile-details',
  templateUrl: './profile-details.component.html',
})
export class ProfileDetailsComponent implements OnInit, OnDestroy {
  isLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  isLoading: boolean;
  private unsubscribe: Subscription[] = [];

  userId: number;
  firstname: string = '';
  lastname: string = '';
  username: string = '';
  email: string = '';
  phone: string = '';
  roleName: string = '';
  avatarUrl: string = './assets/media/avatars/blank.png';

  constructor(
    private cdr: ChangeDetectorRef,
    private auth: AuthService,
    private stateService: StateService,
    private toastr: ToastrService,
    private userService: UserService
  ) {
    const loadingSubscr = this.isLoading$
      .asObservable()
      .subscribe((res) => (this.isLoading = res));
    this.unsubscribe.push(loadingSubscr);
  }

  ngOnInit(): void {
    const user = this.auth.currentUserValue;
    if (user) {
      this.userId = user.id;
      this.firstname = user.firstname || '';
      this.lastname = user.lastname || '';
      this.username = user.username || '';
      this.email = user.email || '';
      this.phone = user.phone || '';
      this.roleName = user.role || '';
      this.avatarUrl = user.pic || './assets/media/avatars/blank.png';
    }
  }

  saveSettings(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.isLoading$.next(true);

    if (!this.firstname || !this.username || !this.email) {
      this.toastr.warning('Por favor completa todos los campos obligatorios (Nombre, Usuario y Correo).', 'Campos Incompletos');
      this.isLoading$.next(false);
      return;
    }

    const currentUser = this.auth.currentUserValue;
    if (!currentUser) {
      this.isLoading$.next(false);
      return;
    }

    const updatedUserPayload: any = {
      name: `${this.firstname} ${this.lastname}`.trim(),
      firstname: this.firstname,
      lastname: this.lastname,
      email: this.email,
      username: this.username,
      phone: this.phone,
      roles: (currentUser.roles || []).map(roleId => ({ id: roleId })),
      status: 'Activo'
    };

    this.userService.updateUser(this.userId, updatedUserPayload).subscribe({
      next: (res) => {
        const systemUsers = this.stateService.systemUsers$.value;
        const foundUser = systemUsers.find(u => u.id === this.userId);
        if (foundUser) {
          foundUser.name = updatedUserPayload.name;
          foundUser.firstname = this.firstname;
          foundUser.lastname = this.lastname;
          foundUser.username = this.username;
          foundUser.email = this.email;
          foundUser.phone = this.phone;
          this.stateService.saveSystemUser(foundUser);
        }

        const updatedAuthUser = { ...currentUser };
        updatedAuthUser.fullname = updatedUserPayload.name;
        updatedAuthUser.firstname = this.firstname;
        updatedAuthUser.lastname = this.lastname;
        updatedAuthUser.username = this.username;
        updatedAuthUser.email = this.email;
        updatedAuthUser.phone = this.phone;
        this.auth.currentUserValue = updatedAuthUser as any;

        this.isLoading$.next(false);
        this.toastr.success('Detalles del perfil actualizados correctamente.', 'Éxito');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading$.next(false);
        const errMsg = err?.error?.message || 'Error al actualizar los detalles del perfil.';
        this.toastr.error(errMsg, 'Error');
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}
