import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { IPermissionModel } from './permission.service';
import { IUserModel } from './user-service';
import { StateService } from '../../pages/state.service';
import { map, tap } from 'rxjs/operators';

export interface DataTablesResponse {
  draw?: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: any[];
}

export interface IRoleModel {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
  permissions: IPermissionModel[];
  users: IUserModel[];
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {

  constructor(
    private http: HttpClient,
    private stateService: StateService
  ) { }

  getUsers(id: number, dataTablesParameters: any): Observable<DataTablesResponse> {
    return this.http.get<any>(`${environment.apiUrl}/roles`, {
      params: { id: id.toString() }
    }).pipe(
      map((role) => {
        const users = (role.users || []).map((u: any) => {
          const fullUser = this.stateService.systemUsers$.value.find(su => su.id === u.id);
          const userRoles = fullUser ? this.stateService.systemRoles$.value.filter(r => fullUser.roleIds.includes(r.id)) : [{ id: role.id, name: role.name }];
          return {
            id: u.id,
            name: u.name,
            email: u.email,
            roles: userRoles
          };
        });

        return {
          recordsTotal: users.length,
          recordsFiltered: users.length,
          data: users
        };
      })
    );
  }

  getRoles(dataTablesParameters?: any): Observable<DataTablesResponse> {
    return this.http.get<DataTablesResponse>(`${environment.apiUrl}/roles`).pipe(
      map((res: any) => {
        const searchVal = dataTablesParameters?.search?.value?.toLowerCase() || '';
        let filtered = res.data || [];
        if (searchVal) {
          filtered = filtered.filter((r: any) => r.name.toLowerCase().includes(searchVal));
        }
        
        return {
          draw: dataTablesParameters?.draw || 1,
          recordsTotal: res.recordsTotal || 0,
          recordsFiltered: filtered.length,
          data: filtered
        };
      })
    );
  }

  getRole(id: number): Observable<IRoleModel> {
    return this.http.get<IRoleModel>(`${environment.apiUrl}/roles`, {
      params: { id: id.toString() }
    });
  }

  createRole(role: IRoleModel): Observable<IRoleModel> {
    const body = {
      name: role.name,
      permissions: role.permissions || []
    };
    return this.http.post<any>(`${environment.apiUrl}/roles`, body).pipe(
      tap((res) => {
        if (res.success) {
          this.stateService.loadRoles();
          this.stateService.loadUsers();
        }
      }),
      map((res) => {
        return {
          id: res.id || role.id,
          name: role.name,
          permissions: role.permissions || [],
          users: []
        };
      })
    );
  }

  updateRole(id: number, role: IRoleModel): Observable<IRoleModel> {
    const body = {
      id: +id,
      name: role.name,
      permissions: role.permissions || []
    };
    return this.http.post<any>(`${environment.apiUrl}/roles`, body).pipe(
      tap((res) => {
        if (res.success) {
          this.stateService.loadRoles();
          this.stateService.loadUsers();
        }
      }),
      map(() => {
        return {
          id: +id,
          name: role.name,
          permissions: role.permissions || [],
          users: role.users || []
        };
      })
    );
  }

  deleteRole(id: number): Observable<void> {
    return this.http.delete<any>(`${environment.apiUrl}/roles`, {
      params: { id: id.toString() }
    }).pipe(
      tap((res) => {
        if (res.success) {
          this.stateService.loadRoles();
          this.stateService.loadUsers();
        }
      }),
      map(() => undefined)
    );
  }

  deleteUser(role_id: number, user_id: number): Observable<void> {
    const systemUser = this.stateService.systemUsers$.value.find(u => u.id === +user_id);
    if (!systemUser) return of(undefined);

    const updatedRoleIds = (systemUser.roleIds || []).filter((rid: number) => rid !== +role_id);
    const body = {
      id: +user_id,
      name: systemUser.name,
      email: systemUser.email,
      roleIds: updatedRoleIds
    };

    return this.http.post<any>(`${environment.apiUrl}/usuarios`, body).pipe(
      tap((res) => {
        if (res.success) {
          this.stateService.loadUsers();
          this.stateService.loadRoles();
        }
      }),
      map(() => undefined)
    );
  }
}
