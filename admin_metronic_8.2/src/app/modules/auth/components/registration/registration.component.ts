import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subscription, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ConfirmPasswordValidator } from './confirm-password.validator';
import { UserModel } from '../../models/user.model';
import { first } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

declare var google: any;

@Component({
  selector: 'app-registration',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.scss'],
})
export class RegistrationComponent implements OnInit, OnDestroy {
  registrationForm: FormGroup;
  hasError: boolean;
  errorMessage: string = '';
  isLoading$: Observable<boolean>;

  // private fields
  private unsubscribe: Subscription[] = []; // Read more: => https://brianflove.com/2016/12/11/anguar-2-unsubscribe-observables/

  static ageValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    const dob = new Date(control.value);
    if (isNaN(dob.getTime())) {
      return { invalidDate: true };
    }
    const birthYear = dob.getFullYear();
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    if (age < 14 || age > 105) {
      return { ageRange: true };
    }
    return null;
  }

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.isLoading$ = this.authService.isLoading$;
    // redirect to home if already logged in
    if (this.authService.currentUserValue) {
      this.router.navigate(['/']);
    }
  }

  ngOnInit(): void {
    this.initForm();
  }

  // convenience getter for easy access to form fields
  get f() {
    return this.registrationForm.controls;
  }

  initForm() {
    this.registrationForm = this.fb.group(
      {
        firstname: [
          '',
          Validators.compose([
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(50),
          ]),
        ],
        lastname: [
          '',
          Validators.compose([
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(50),
          ]),
        ],
        dob: [
          '',
          Validators.compose([
            Validators.required,
            RegistrationComponent.ageValidator
          ]),
        ],
        phone: [
          '',
          Validators.compose([
            Validators.required,
            Validators.minLength(5),
            Validators.maxLength(20),
          ]),
        ],
        address: [
          '',
          Validators.compose([
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(150),
          ]),
        ],
        username: [
          '',
          Validators.compose([
            Validators.minLength(3),
            Validators.maxLength(50),
          ]),
        ],
        email: [
          '',
          Validators.compose([
            Validators.required,
            Validators.email,
            Validators.minLength(3),
            Validators.maxLength(320), // https://stackoverflow.com/questions/386294/what-is-the-maximum-length-of-a-valid-email-address
          ]),
        ],
        password: [
          '',
          Validators.compose([
            Validators.required,
            Validators.minLength(8),
            Validators.maxLength(100),
            Validators.pattern(/^(?=.*[0-9])(?=.*[^a-zA-Z0-9\s])\S{8,}$/),
          ]),
        ],
        cPassword: [
          '',
          Validators.compose([
            Validators.required,
            Validators.minLength(8),
            Validators.maxLength(100),
            Validators.pattern(/^(?=.*[0-9])(?=.*[^a-zA-Z0-9\s])\S{8,}$/),
          ]),
        ],
        agree: [false, Validators.compose([Validators.required])],
      },
      {
        validator: ConfirmPasswordValidator.MatchPassword,
      }
    );
  }

  submit() {
    this.hasError = false;
    this.errorMessage = '';
    const payload = {
      name: this.f.firstname.value + ' ' + this.f.lastname.value,
      firstname: this.f.firstname.value,
      lastname: this.f.lastname.value,
      dob: this.f.dob.value,
      phone: this.f.phone.value,
      address: this.f.address.value,
      username: this.f.username.value,
      email: this.f.email.value,
      password: this.f.password.value,
      // Map to Spanish / database keys as well to be robust
      nombre: this.f.firstname.value,
      apellido: this.f.lastname.value,
      fechaNacimiento: this.f.dob.value,
      telefono: this.f.phone.value,
      direccion: this.f.address.value,
      usuario: this.f.username.value,
      contrasena: this.f.password.value
    };
    const registrationSubscr = this.authService
      .registration(payload)
      .pipe(first())
      .subscribe({
        next: (user: UserModel) => {
          if (user) {
            this.router.navigate(['/']);
          } else {
            this.hasError = true;
            this.errorMessage = 'Los datos de registro son incorrectos o el inicio de sesión automático falló.';
          }
        },
        error: (err) => {
          this.hasError = true;
          this.errorMessage = err.error?.message || err.message || 'Error en el servidor al registrar el usuario';
        }
      });
    this.unsubscribe.push(registrationSubscr);
  }

  loginWithGoogle(event: Event) {
    event.preventDefault();
    this.hasError = false;

    if (typeof google === 'undefined') {
      alert('El SDK de Google no se ha cargado correctamente. Por favor intenta de nuevo.');
      return;
    }

    const client = google.accounts.oauth2.initTokenClient({
      client_id: environment.googleClientId,
      scope: 'email profile openid',
      callback: (response: any) => {
        if (response.access_token) {
          const googleLoginSub = this.authService.loginWithGoogle(response.access_token)
            .pipe(first())
            .subscribe((user) => {
              if (user) {
                this.router.navigate(['/']);
              } else {
                this.hasError = true;
                this.errorMessage = 'No se pudo iniciar sesión con Google. Por favor intenta de nuevo.';
              }
            });
          this.unsubscribe.push(googleLoginSub);
        } else {
          this.hasError = true;
          this.errorMessage = 'Acceso cancelado o fallido con Google.';
        }
      },
    });
    client.requestAccessToken();
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}
