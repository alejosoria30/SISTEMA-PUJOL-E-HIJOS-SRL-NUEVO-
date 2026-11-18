import { Injectable, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, of, Subscription, throwError } from 'rxjs';
import { map, catchError, switchMap, finalize } from 'rxjs/operators';
import { UserModel } from '../models/user.model';
import { AuthModel } from '../models/auth.model';
import { AuthHTTPService } from './auth-http';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { StateService } from '../../../pages/state.service';

export type UserType = UserModel | undefined;

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  // private fields
  private unsubscribe: Subscription[] = []; // Read more: => https://brianflove.com/2016/12/11/anguar-2-unsubscribe-observables/
  private authLocalStorageToken = `${environment.appVersion}-${environment.USERDATA_KEY}`;

  // public fields
  currentUser$: Observable<UserType>;
  isLoading$: Observable<boolean>;
  currentUserSubject: BehaviorSubject<UserType>;
  isLoadingSubject: BehaviorSubject<boolean>;

  get currentUserValue(): UserType {
    return this.currentUserSubject.value;
  }

  set currentUserValue(user: UserType) {
    if (!this.currentUserValue) this.stateService.configurarAcceso(user);
          this.currentUserSubject.next(user);
  }

  private inactivityTimer: any;
  private INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hora (60 minutos)

  constructor(
    private authHttpService: AuthHTTPService,
    private router: Router,
    private stateService: StateService
  ) {
    this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    this.currentUserSubject = new BehaviorSubject<UserType>(undefined);
    this.currentUser$ = this.currentUserSubject.asObservable();
    this.isLoading$ = this.isLoadingSubject.asObservable();
    const subscr = this.getUserByToken().subscribe(user => {
      if (user) {
        this.resetInactivity();
      }
    });
    this.unsubscribe.push(subscr);

    // Actividad del usuario (clicks, mouse, scroll, teclado)
    const activityEvents = ['mousemove', 'click', 'keypress', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      window.addEventListener(event, () => this.resetInactivity());
    });
  }

  // public methods
  login(username: string, password: string, claveNueva = ''): Observable<UserType> {
    this.isLoadingSubject.next(true);

      return this.authHttpService.login(username, password, claveNueva).pipe(
        map((auth: any) => {
          if (auth && auth.authToken) {
            this.setAuthFromLocalStorage(auth);
            return auth;
          }
          return undefined;
        }),
        switchMap((auth) => {
          if (auth) {
            return this.getUserByToken();
          }
          return of(undefined);
        }),
      catchError((err) => {
          console.error('login err', err);
          if ([403,409,429].includes(err?.status)) {
            return throwError(() => err);
          }
          return of(undefined);
        }),
        finalize(() => this.isLoadingSubject.next(false))
      );
  }

  logout() {
    if (this.getAuthFromLocalStorage()) this.authHttpService.salir().subscribe({error: () => {}});
    this.stopInactivityTimer();
    sessionStorage.removeItem(this.authLocalStorageToken);
    this.stateService.limpiarSesion();
    this.currentUserSubject.next(undefined);
    this.router.navigate(['/auth/login'], {
      queryParams: {},
    });
  }

  private startInactivityTimer() {
    this.stopInactivityTimer();
    this.inactivityTimer = setTimeout(() => {
      this.logout();
      alert('Sesión finalizada por inactividad.');
    }, this.INACTIVITY_TIMEOUT);
  }

  private stopInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
  }

  public resetInactivity() {
    if (this.currentUserValue) {
      this.startInactivityTimer();
    }
  }

  getUserByToken(): Observable<UserType> {
    const auth = this.getAuthFromLocalStorage();
    if (!auth || !auth.authToken) {
      return of(undefined);
    }

    this.isLoadingSubject.next(true);
    return this.authHttpService.getUserByToken(auth.authToken).pipe(
      map((user: UserType) => {
        if (user) {
          if (user.fullname && (!user.firstname || !user.lastname)) {
            const parts = user.fullname.trim().split(/\s+/);
            if (!user.firstname) user.firstname = parts[0] || '';
            if (!user.lastname) user.lastname = parts.slice(1).join(' ') || '';
          }
          if (!this.currentUserValue) this.stateService.configurarAcceso(user);
          this.currentUserSubject.next(user);
        } else {
          this.logout();
        }
        return user;
      }),
      catchError(() => {
        this.logout();
        return of(undefined);
      }),
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  forgotPassword(email: string): Observable<boolean> {
    this.isLoadingSubject.next(true);
    return this.authHttpService
      .forgotPassword(email)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  // private methods
  private setAuthFromLocalStorage(auth: AuthModel): boolean {
    // store auth authToken/refreshToken/epiresIn in session storage to logout on browser close
    if (auth && auth.authToken) {
      sessionStorage.setItem(this.authLocalStorageToken, JSON.stringify(auth));
      return true;
    }
    return false;
  }

  private getAuthFromLocalStorage(): AuthModel | undefined {
    try {
      const lsValue = sessionStorage.getItem(this.authLocalStorageToken);
      if (!lsValue) {
        return undefined;
      }

      const authData = JSON.parse(lsValue);
      return authData;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  hasPermission(nombrePermiso: string, action: 'read' | 'create' | 'update' | 'delete' = 'read'): boolean {
    const user = this.currentUserValue;
    if (!user) return false;
    if (user.roles?.includes(1)) return true;
    const acciones = {read: 'visualizar', create: 'crear', update: 'modificar', delete: 'anular'};
    return Number((user as any).permisos?.[nombrePermiso]?.[acciones[action]]) === 1;
  }

  hasAction(permissionId: number, action: 'read' | 'create' | 'update' | 'delete' = 'read'): boolean {
    const user = this.currentUserValue;
    if (!user) return false;

    // Admin (role ID 1) has all permissions
    if (user.roles && user.roles.includes(1)) {
      return true;
    }

    const nombres: Record<number,string> = {
      1: 'Acceder al Dashboard',
      2: 'Gestionar Stock',
      3: 'Caja presencial',
      4: 'Comprobantes presenciales',
      5: 'Gestionar Ventas',
      8: 'Ver Historial de Ventas',
      9: 'Modificar Mi Perfil',
      10: 'Caja presencial',
      11: 'Comprobantes presenciales',
      12: 'Catálogo de productos',
      13: 'Clasificación de productos',
      14: 'Cobros QR',
      15: 'Ajustar cantidad de stock',
      16: 'Ver movimientos de stock',
      17: 'Registrar entradas de stock',
      18: 'Registrar salidas de stock',
      19: 'Ver historial de caja'
    };
    const acciones = {read:'visualizar',create:'crear',update:'modificar',delete:'anular'};
    return Number((user as any).permisos?.[nombres[permissionId]]?.[acciones[action]]) === 1;
  }
  hasAnyPermission(): boolean {
    return [1,2,3,4,5,8,9,12,13,14].some(id => this.hasAction(id));
  }
  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}
