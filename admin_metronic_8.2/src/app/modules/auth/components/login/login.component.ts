
import {
  Component,
  OnInit,
  OnDestroy
} from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import {
  Subscription,
  Observable
} from 'rxjs';

import { first } from 'rxjs/operators';

import { UserModel } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';

declare var google: any;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy {

  // ==========================================
  // DATOS PREDETERMINADOS DEL FORMULARIO
  // ==========================================

  defaultAuth: any = {
    username: '',
    password: '',
    rememberMe: false
  };

  loginForm: FormGroup;
  hasError: boolean = false;

  errorType: string = 'invalid_credentials';

  returnUrl: string = '/';

  isLoading$: Observable<boolean>;

  // ==========================================
  // VISIBILIDAD DE LA CONTRASEÑA
  // ==========================================

  showPassword: boolean = false;

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // ==========================================
  // SUSCRIPCIONES
  // ==========================================

  private unsubscribe: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {

    this.isLoading$ = this.authService.isLoading$;

    // Redirigir si el usuario ya inició sesión

    if (this.authService.currentUserValue) {
      this.router.navigate(['/']);
    }
  }

  // ==========================================
  // INICIALIZACIÓN DEL COMPONENTE
  // ==========================================

  ngOnInit(): void {

    this.initForm();

    // Obtener la URL de retorno

    this.returnUrl =
      this.route.snapshot.queryParams['returnUrl'.toString()] || '/';

    // Recuperar usuario recordado

    const remembered =
      localStorage.getItem('pujol_remembered_username');

    if (remembered) {

      this.loginForm.patchValue({
        username: remembered,
        rememberMe: true
      });
    }
  }

  // ==========================================
  // ACCESO A CONTROLES DEL FORMULARIO
  // ==========================================

  get f() {
    return this.loginForm.controls;
  }

  // ==========================================
  // CONFIGURACIÓN DEL FORMULARIO
  // ==========================================

  initForm(): void {

    this.loginForm = this.fb.group({

      username: [

        this.defaultAuth.username,

        Validators.compose([
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(100),
        ]),

      ],

      password: [

        this.defaultAuth.password,

        Validators.compose([
          Validators.required,
          Validators.pattern(
            /^(?=.*[0-9])(?=.*[^a-zA-Z0-9\s])\S{8,}$/
          ),
        ]),

      ],

      rememberMe: [
        this.defaultAuth.rememberMe
      ]

    });
  }

  // ==========================================
  // INICIO DE SESIÓN TRADICIONAL
  // ==========================================

  submit(): void {

    this.hasError = false;

    this.errorType = 'invalid_credentials';

    const loginSubscr = this.authService

      .login(
        this.f.username.value,
        this.f.password.value
      )

      .pipe(first())

      .subscribe({

        next: (user: UserModel | undefined) => {

          if (user) {

            // ==================================
            // RECORDAR USUARIO
            // ==================================

            if (this.f.rememberMe.value) {

              localStorage.setItem(
                'pujol_remembered_username',
                this.f.username.value
              );

            } else {

              localStorage.removeItem(
                'pujol_remembered_username'
              );
            }

            // Restablecer contador de inactividad

            this.authService.resetInactivity();

            // Ocultar contraseña al finalizar

            this.showPassword = false;

            // Redirigir al sistema

            this.router.navigate([
              this.returnUrl
            ]);

          } else {

            this.hasError = true;
          }
        },

        error: (err: any) => {

          this.hasError = true;

          if (
            err?.status === 403 ||
            err?.error?.error_type === 'no_permission'
          ) {

            this.errorType = 'no_permission';
          }
        }

      });

    this.unsubscribe.push(loginSubscr);
  }

  // ==========================================
  // INICIAR SESIÓN CON GOOGLE
  // ==========================================

  loginWithGoogle(event: Event): void {

    event.preventDefault();

    this.hasError = false;

    this.errorType = 'invalid_credentials';

    if (typeof google === 'undefined') {

      alert(
        'El SDK de Google no se ha cargado correctamente. Por favor intenta de nuevo.'
      );

      return;
    }

    const client = google.accounts.oauth2.initTokenClient({

      client_id: environment.googleClientId,

      scope: 'email profile openid',

      callback: (response: any) => {

        if (response.access_token) {

          const googleLoginSub = this.authService

            .loginWithGoogle(response.access_token)

            .pipe(first())

            .subscribe({

              next: (user) => {

                if (user) {

                  this.router.navigate([
                    this.returnUrl
                  ]);

                } else {

                  this.hasError = true;
                }
              },

              error: (err: any) => {

                this.hasError = true;

                if (
                  err?.status === 403 ||
                  err?.error?.error_type === 'no_permission'
                ) {

                  this.errorType = 'no_permission';
                }
              }

            });

          this.unsubscribe.push(
            googleLoginSub
          );

        } else {

          this.hasError = true;
        }
      },
    });

    client.requestAccessToken();
  }

  // ==========================================
  // LIBERACIÓN DE SUSCRIPCIONES
  // ==========================================

  ngOnDestroy(): void {

    this.unsubscribe.forEach(
      (subscription) => subscription.unsubscribe()
    );
  }
}
