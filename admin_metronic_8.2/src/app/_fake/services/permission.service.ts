import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { StateService } from '../../pages/state.service';
import { map, tap } from 'rxjs/operators';

export interface DataTablesResponse {
  draw?: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: any[];
}

export interface IPermissionModel {
  id: number;
  name: string;
  can_read?: boolean;
  can_create?: boolean;
  can_update?: boolean;
  can_delete?: boolean;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PermissionService {

  constructor(
    private http: HttpClient,
    private stateService: StateService
  ) { }

  getPermissions(dataTablesParameters: any): Observable<DataTablesResponse> {
    const start = dataTablesParameters?.start || 0;
    const length = dataTablesParameters?.length || 10;
    const draw = dataTablesParameters?.draw || 1;
    const search = dataTablesParameters?.search?.value || '';

    return this.http.get<DataTablesResponse>(`${environment.apiUrl}/permisos`, {
      params: {
        start: start.toString(),
        length: length.toString(),
        draw: draw.toString(),
        search: search
      }
    });
  }

  getPermission(id: number): Observable<IPermissionModel> {
    return this.http.get<IPermissionModel>(`${environment.apiUrl}/permisos`, {
      params: { id: id.toString() }
    });
  }

  createPermission(permission: IPermissionModel): Observable<IPermissionModel> {
    return this.http.post<any>(`${environment.apiUrl}/permisos`, permission).pipe(
      tap((res) => {
        if (res.success) {
          this.stateService.loadPermissions();
        }
      }),
      map((res) => {
        return {
          id: res.id || permission.id,
          name: permission.name
        };
      })
    );
  }

  updatePermission(id: number, permission: IPermissionModel): Observable<IPermissionModel> {
    const body = { ...permission, id: +id };
    return this.http.post<any>(`${environment.apiUrl}/permisos`, body).pipe(
      tap((res) => {
        if (res.success) {
          this.stateService.loadPermissions();
        }
      }),
      map(() => body)
    );
  }

  deletePermission(id: number): Observable<void> {
    return this.http.delete<any>(`${environment.apiUrl}/permisos`, {
      params: { id: id.toString() }
    }).pipe(
      tap((res) => {
        if (res.success) {
          this.stateService.loadPermissions();
        }
      }),
      map(() => undefined)
    );
  }
}
