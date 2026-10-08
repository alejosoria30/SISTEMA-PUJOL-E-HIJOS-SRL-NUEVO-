import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth/services/auth.service';
import { PageInfoService } from '../../_metronic/layout/core/page-info.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  user: any = null;

  constructor(
    private authService: AuthService,
    private pageInfo: PageInfoService
  ) {}

  ngOnInit(): void {
    this.pageInfo.updateTitle('Mi Perfil');
    this.pageInfo.updateBreadcrumbs([
      { title: 'Inicio', path: '/', isActive: false, isSeparator: false },
      { title: '', path: '', isActive: false, isSeparator: true }
    ]);
    
    this.user = { ...this.authService.currentUserValue };
    if (!this.user.address) {
      this.user.address = {};
    }
  }

  hasAction(action: 'read' | 'create' | 'update' | 'delete'): boolean {
    return this.authService.hasAction(7, action); // 7: Administración (Manejo de usuarios)
  }

  saveProfile() {
    if (this.hasAction('update')) {
      // Logic to save the profile
      console.log('Profile saved:', this.user);
      // alert('Perfil actualizado correctamente');
    }
  }
}
