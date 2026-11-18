import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription, Observable } from 'rxjs';
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
  // KeenThemes mock, change it to:
  defaultAuth: any = {
    username: '',
    password: '',
    rememberMe: false
  };
  loginForm: FormGroup;
  hasError: boolean;
  cambio=false;
  mensaje='';
  esEmpleado=location.pathname.endsWith('/empleados');
  errorType: string = 'invalid_credentials'; // 'invalid_credentials' | 'no_permission'
  returnUrl: string;
  isLoading$: Observable<boolean>;

  // private fields
  private unsubscribe: Subscription[] = []; // Read more: => https://brianflove.com/2016/12/11/anguar-2-unsubscribe-observables/

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
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
    // get return url from route parameters or default to '/'
    this.returnUrl =
      this.route.snapshot.queryParams['returnUrl'.toString()] || '/';

    // Load remembered username
    const remembered = localStorage.getItem('pujol_remembered_username');
    if (remembered) {
      this.loginForm.patchValue({
        username: remembered,
        rememberMe: true
      });
    }
  }

  // convenience getter for easy access to form fields
  get f() {
    return this.loginForm.controls;
  }

  initForm() {
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

        ]),
      ],
      claveNueva: [''],
      rememberMe: [
        this.defaultAuth.rememberMe
      ]
    });
  }

  submit() {
    this.hasError = false;
    this.errorType = 'invalid_credentials';
    const loginSubscr = this.authService
      .login(this.f.username.value, this.f.password.value,this.f.claveNueva.value)
      .pipe(first())
      .subscribe({
        next: (user: UserModel | undefined) => {
          if (user) {
            if (this.f.rememberMe.value) {
              localStorage.setItem('pujol_remembered_username', this.f.username.value);
            } else {
              localStorage.removeItem('pujol_remembered_username');
            }
            this.authService.resetInactivity();
            this.router.navigate([this.returnUrl]);
          } else {
            this.hasError = true;
          }
        },
        error: (err: any) => {
          this.cambio=!!err?.error?.cambio;
          this.mensaje=err?.error?.message || '';
          this.hasError = true;
          if (err?.status === 403 || err?.error?.error_type === 'no_permission') {
            this.errorType = 'no_permission';
          }
        }
      });
    this.unsubscribe.push(loginSubscr);
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}
