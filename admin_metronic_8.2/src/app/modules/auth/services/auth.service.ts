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
  login(username: string, password: string): Observable<UserType> {
    this.isLoadingSubject.next(true);

    if (environment.isMockEnabled) {
      const users = this.stateService.systemUsers$.value;
      const foundUser = users.find(
        (u: any) =>
          (u.username.toLowerCase() === username.toLowerCase() ||
           u.email.toLowerCase() === username.toLowerCase()) &&
          u.password === password
      );

      if (foundUser) {
        const auth = new AuthModel();
        auth.authToken = `local-auth-token-${foundUser.id}`;
        auth.refreshToken = `local-auth-token-${foundUser.id}`;
        auth.expiresIn = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000);

        this.setAuthFromLocalStorage(auth);

        // Map roles
        const roles = this.stateService.systemRoles$.value;
        const userRoles = roles.filter((r: any) => foundUser.roleIds.includes(r.id));

        const userModel = new UserModel();
        userModel.id = foundUser.id;
        userModel.username = foundUser.username;
        userModel.fullname = foundUser.name;
        userModel.email = foundUser.email;
        userModel.roles = foundUser.roleIds;
        userModel.role = userRoles.map((r: any) => r.name).join(', ');
        userModel.phone = foundUser.phone || '';
        const nameParts = (foundUser.name || '').split(' ');
        userModel.firstname = foundUser.firstname || nameParts[0] || '';
        userModel.lastname = foundUser.lastname || nameParts.slice(1).join(' ') || '';
        userModel.pic = foundUser.id === 1 ? './assets/media/avatars/300-1.jpg' : foundUser.id === 2 ? './assets/media/avatars/300-6.jpg' : './assets/media/avatars/300-20.jpg';

        this.currentUserSubject.next(userModel);
        this.resetInactivity();
        this.isLoadingSubject.next(false);
        return of(userModel);
      } else {
        this.isLoadingSubject.next(false);
        return of(undefined);
      }
    } else {
      return this.authHttpService.login(username, password).pipe(
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
          if (err?.status === 403) {
            return throwError(() => err);
          }
          return of(undefined);
        }),
        finalize(() => this.isLoadingSubject.next(false))
      );
    }
  }

  loginWithGoogle(accessToken: string): Observable<UserType> {
    this.isLoadingSubject.next(true);

    if (environment.isMockEnabled) {
      const users = this.stateService.systemUsers$.value;
      let foundUser = users.find((u: any) => u.email.toLowerCase() === 'google@demo.com');

      if (!foundUser) {
        foundUser = {
          id: users.length > 0 ? Math.max(...users.map((u: any) => u.id)) + 1 : 1,
          name: 'Google User',
          username: 'googleuser',
          email: 'google@demo.com',
          password: 'Password123!',
          roleIds: [3],
          created_at: new Date().toISOString()
        };
        this.stateService.saveSystemUser(foundUser);
      }

      const auth = new AuthModel();
      auth.authToken = `local-auth-token-${foundUser.id}`;
      auth.refreshToken = `local-auth-token-${foundUser.id}`;
      auth.expiresIn = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000);

      this.setAuthFromLocalStorage(auth);

      const roles = this.stateService.systemRoles$.value;
      const userRoles = roles.filter((r: any) => foundUser.roleIds.includes(r.id));

      const userModel = new UserModel();
      userModel.id = foundUser.id;
      userModel.username = foundUser.username;
      userModel.fullname = foundUser.name;
      userModel.email = foundUser.email;
      userModel.roles = foundUser.roleIds;
      userModel.role = userRoles.map((r: any) => r.name).join(', ');
      userModel.pic = './assets/media/avatars/300-20.jpg';

      this.currentUserSubject.next(userModel);
      this.resetInactivity();
      this.isLoadingSubject.next(false);
      return of(userModel);
    } else {
      return this.authHttpService.loginWithGoogle(accessToken).pipe(
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
          console.error('google login err', err);
          if (err?.status === 403) {
            return throwError(() => err);
          }
          return of(undefined);
        }),
        finalize(() => this.isLoadingSubject.next(false))
      );
    }
  }

  logout() {
    this.stopInactivityTimer();
    sessionStorage.removeItem(this.authLocalStorageToken);
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

    const token = auth.authToken;
    if (token.startsWith('local-auth-token-')) {
      const id = parseInt(token.replace('local-auth-token-', ''));
      const users = this.stateService.systemUsers$.value;
      const foundUser = users.find((u: any) => u.id === id);
      if (foundUser) {
        const roles = this.stateService.systemRoles$.value;
        const userRoles = roles.filter((r: any) => foundUser.roleIds.includes(r.id));

        const userModel = new UserModel();
        userModel.id = foundUser.id;
        userModel.username = foundUser.username;
        userModel.fullname = foundUser.name;
        userModel.email = foundUser.email;
        userModel.roles = foundUser.roleIds;
        userModel.role = userRoles.map((r: any) => r.name).join(', ');
        userModel.phone = foundUser.phone || '';
        const nameParts = (foundUser.name || '').split(' ');
        userModel.firstname = foundUser.firstname || nameParts[0] || '';
        userModel.lastname = foundUser.lastname || nameParts.slice(1).join(' ') || '';
        userModel.pic = foundUser.id === 1 ? './assets/media/avatars/300-1.jpg' : foundUser.id === 2 ? './assets/media/avatars/300-6.jpg' : './assets/media/avatars/300-20.jpg';

        this.currentUserSubject.next(userModel);
        return of(userModel);
      }
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

  // need create new user then login
  registration(user: any): Observable<any> {
    this.isLoadingSubject.next(true);
    if (environment.isMockEnabled) {
      const mockUser = {
        id: 0,
        name: user.firstname + ' ' + user.lastname,
        username: user.email.split('@')[0],
        email: user.email,
        password: user.password,
        roleIds: [3], // Cliente role
      };
      this.stateService.saveSystemUser(mockUser);
      this.isLoadingSubject.next(false);
      return this.login(user.email, user.password);
    } else {
      return this.authHttpService.createUser(user).pipe(
        switchMap(() => this.login(user.email, user.password)),
        finalize(() => this.isLoadingSubject.next(false))
      );
    }
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

  hasAction(permissionId: number, action: 'read' | 'create' | 'update' | 'delete' = 'read'): boolean {
    const user = this.currentUserValue;
    if (!user) return false;

    // Admin (role ID 1) has all permissions
    if (user.roles && user.roles.includes(1)) {
      return true;
    }

    const systemUsers = this.stateService.systemUsers$.value;
    const foundUser = systemUsers.find(u => u.id === user.id);
    if (!foundUser) return false;

    const roles = this.stateService.systemRoles$.value;
    const userRoles = roles.filter(r => foundUser.roleIds.includes(r.id));

    let hasAccess = false;
    userRoles.forEach(r => {
      if (r.permissions) {
        const perm = r.permissions.find((p: any) => p.id === permissionId);
        if (perm) {
          if (action === 'read' && perm.can_read) hasAccess = true;
          if (action === 'create' && perm.can_create) hasAccess = true;
          if (action === 'update' && perm.can_update) hasAccess = true;
          if (action === 'delete' && perm.can_delete) hasAccess = true;
        }
      }
    });

    return hasAccess;
  }

  hasAnyPermission(): boolean {
    const user = this.currentUserValue;
    if (!user) return false;

    // Admin (role ID 1) has all permissions
    if (user.roles && user.roles.includes(1)) {
      return true;
    }

    const systemUsers = this.stateService.systemUsers$.value;
    const foundUser = systemUsers.find(u => u.id === user.id);
    if (!foundUser) return false;

    const roles = this.stateService.systemRoles$.value;
    const userRoles = roles.filter(r => foundUser.roleIds.includes(r.id));

    let hasAny = false;
    userRoles.forEach(r => {
      if (r.permissions && r.permissions.length > 0) {
        // Only count if they have at least one 'can_read' action enabled somewhere
        const hasActivePerm = r.permissions.some((p: any) => p.can_read || p.can_create || p.can_update || p.can_delete);
        if (hasActivePerm) hasAny = true;
      }
    });

    return hasAny;
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}
