import { Injectable, NgModule } from '@angular/core';
import { Routes, RouterModule, TitleStrategy, RouterStateSnapshot } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { AuthGuard } from './modules/auth/services/auth.guard';

@Injectable({ providedIn: 'root' })
export class CustomPageTitleStrategy extends TitleStrategy {
  constructor(private readonly title: Title) {
    super();
  }

  override updateTitle(routerState: RouterStateSnapshot) {
    const title = this.buildTitle(routerState);
    if (title) {
      this.title.setTitle(`Pujol e Hijos S.R.L. - ${title}`);
    } else {
      const url = routerState.url.split('?')[0];
      const fallbackTitle = this.getTitleFromUrl(url);
      if (fallbackTitle) {
        this.title.setTitle(`Pujol e Hijos S.R.L. - ${fallbackTitle}`);
      } else {
        this.title.setTitle('Pujol e Hijos S.R.L.');
      }
    }
  }

  private getTitleFromUrl(url: string): string {
    if (url.includes('/auth/login')) return 'Iniciar Sesión';
    if (url.includes('/auth/registration')) return 'Registro';
    if (url.includes('/auth/forgot-password')) return 'Recuperar Contraseña';
    if (url.includes('/dashboard')) return 'Dashboard';
    if (url.includes('/catalogo')) return 'Catálogo de Bebidas';
    if (url.includes('/stock')) return 'Control de Stock';
    if (url.includes('/ventas')) return 'Ventas POS';
    if (url.includes('/pedidos')) return 'Pedidos';
    if (url.includes('/caja')) return 'Caja y Rendiciones';
    if (url.includes('/comprobantes')) return 'Comprobantes Fiscales';
    if (url.includes('/historial-ventas')) return 'Historial de Ventas';
    if (url.includes('/clientes')) return 'Clientes';
    if (url.includes('/empleados')) return 'Empleados';
    if (url.includes('/apps/users')) return 'Gestión de Usuarios';
    if (url.includes('/apps/roles')) return 'Roles y Permisos';
    if (url.includes('/apps/permissions')) return 'Permisos del Sistema';
    if (url.includes('/builder')) return 'Maquetador de Vistas';
    if (url.includes('/crafted/pages/profile')) return 'Perfil de Usuario';
    if (url.includes('/crafted/account')) return 'Mi Cuenta';
    return '';
  }
}

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./modules/auth/auth.module').then((m) => m.AuthModule),
  },
  {
    path: 'error',
    loadChildren: () =>
      import('./modules/errors/errors.module').then((m) => m.ErrorsModule),
  },
  {
    path: '',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./_metronic/layout/layout.module').then((m) => m.LayoutModule),
  },
  { path: '**', redirectTo: 'error/404' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [
    { provide: TitleStrategy, useClass: CustomPageTitleStrategy },
  ],
})
export class AppRoutingModule {}
