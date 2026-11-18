import { inject } from '@angular/core';
import { AuthService } from '../modules/auth/services/auth.service';
import { Routes } from '@angular/router';

const administrador=()=>!!inject(AuthService).currentUserValue?.roles.includes(1);
const administracion=()=>import('./administracion-pos.component').then(m=>m.AdministracionPosComponent);
const Routing: Routes = [
  {path:'configuracion',canActivate:[administrador],loadComponent:administracion},
  {path:'categorias',canActivate:[administrador],loadComponent:administracion},
  {path:'accesos',canActivate:[administrador],loadComponent:administracion},
  {path:'mercado-pago',canActivate:[administrador],loadComponent:administracion},
  {
    path: 'dashboard',
    title: 'Dashboard',
    loadChildren: () => import('./dashboard/dashboard.module').then((m) => m.DashboardModule),
  },
  {
    path: 'crafted/pages/profile',
    title: 'Perfil de Usuario',
    loadChildren: () => import('../modules/profile/profile.module').then((m) => m.ProfileModule),
    // data: { layout: 'light-sidebar' },
  },
  {
    path: 'crafted/account',
    title: 'Mi Cuenta',
    loadChildren: () => import('../modules/account/account.module').then((m) => m.AccountModule),
    // data: { layout: 'dark-header' },
  },
  // Una administración unificada: conserva los módulos CRUD probados como pestañas internas.
  {
    path: 'personal', canActivate: [administrador], title: 'Personal y accesos',
    loadComponent: () => import('./personal/personal-accesos.component').then(m => m.PersonalAccesosComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'empleados' },
      { path: 'empleados', loadChildren: () => import('./user/user.module').then(m => m.UserModule) },
      { path: 'perfiles', loadChildren: () => import('./role/role.module').then(m => m.RoleModule) },
      { path: 'permisos', loadChildren: () => import('./permission/permission.module').then(m => m.PermissionModule) },
    ],
  },
  // Compatibilidad con enlaces, favoritos y vistas de versiones anteriores.
  { path: 'apps/users/:id', redirectTo: 'personal/empleados/:id', pathMatch: 'full' },
  { path: 'apps/roles/:id', redirectTo: 'personal/perfiles/:id', pathMatch: 'full' },
  { path: 'apps/permissions/:id', redirectTo: 'personal/permisos/:id', pathMatch: 'full' },
  { path: 'apps/users', redirectTo: 'personal/empleados', pathMatch: 'full' },
  { path: 'apps/roles', redirectTo: 'personal/perfiles', pathMatch: 'full' },
  { path: 'apps/permissions', redirectTo: 'personal/permisos', pathMatch: 'full' },
  {
    path: 'catalogo',canActivate:[()=>inject(AuthService).hasAction(12)],
    title: 'Catálogo de productos',
    loadChildren: () => import('./catalogo/catalogo.module').then((m) => m.CatalogoModule),
  },
  {
    path: 'stock',canActivate:[()=>inject(AuthService).hasAction(2)],
    title: 'Control de Stock',
    loadChildren: () => import('./stock/stock.module').then((m) => m.StockModule),
  },
  {
    path: 'caja',canActivate:[()=>inject(AuthService).hasAction(3)],
    title: 'Caja y Rendiciones',
    loadChildren: () => import('./caja/caja.module').then((m) => m.CajaModule),
  },
  {
    path: 'comprobantes',canActivate:[()=>inject(AuthService).hasAction(4)],
    title: 'Comprobantes Fiscales',
    loadChildren: () => import('./comprobantes/comprobantes.module').then((m) => m.ComprobantesModule),
  },
  {
    path: 'ventas',canActivate:[()=>inject(AuthService).hasAction(5)],
    title: 'Ventas POS',
    loadChildren: () => import('./ventas/ventas.module').then((m) => m.VentasModule),
  },
  {
    path: 'historial-ventas',canActivate:[()=>inject(AuthService).hasAction(8)],
    title: 'Historial de Ventas',
    loadChildren: () => import('./historial-ventas/historial-ventas.module').then((m) => m.HistorialVentasModule),
  },
  {path:'movimientos-stock',canActivate:[()=>inject(AuthService).hasAction(2)],loadChildren:()=>import('./stock/stock.module').then(m=>m.StockModule)},
  {path:'historial-caja',canActivate:[()=>inject(AuthService).hasAction(3)],loadChildren:()=>import('./caja/caja.module').then(m=>m.CajaModule)},
  {path:'empleados',redirectTo:'personal/empleados',pathMatch:'full'},
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'error/404',
  },
];

export { Routing };
