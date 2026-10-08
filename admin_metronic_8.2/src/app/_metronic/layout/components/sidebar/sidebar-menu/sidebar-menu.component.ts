import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../../../modules/auth/services/auth.service';
import { StateService } from '../../../../../pages/state.service';

@Component({
  selector: 'app-sidebar-menu',
  templateUrl: './sidebar-menu.component.html',
  styleUrls: ['./sidebar-menu.component.scss']
})
export class SidebarMenuComponent implements OnInit {

  constructor(
    private authService: AuthService,
    private stateService: StateService
  ) { }

  ngOnInit(): void {
  }

  hasRole(rolesAllowed: number[]): boolean {
    const user = this.authService.currentUserValue;
    if (!user || !user.roles) {
      return false;
    }
    return user.roles.some(role => rolesAllowed.includes(role));
  }

  hasPermission(permissionId: number): boolean {
    return this.authService.hasAction(permissionId, 'read');
  }
}
