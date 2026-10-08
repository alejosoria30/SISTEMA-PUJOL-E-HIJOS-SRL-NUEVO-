import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { IRoleModel } from './role.service';
import { StateService } from '../../pages/state.service';
import { map, tap } from 'rxjs/operators';

export interface DataTablesResponse {
    draw?: number;
    recordsTotal: number;
    recordsFiltered: number;
    data: any[];
}

export interface IUserModel {
    avatar?: null | string;
    created_at?: string;
    email: string;
    email_verified_at?: string;
    id: number;
    last_login_at?: null | string;
    last_login_ip?: null | string;
    name?: string;
    firstname?: string;
    lastname?: string;
    profile_photo_path?: null | string;
    updated_at?: string;
    password?: string;
    roles?: IRoleModel[];
    role?: string;
    username?: string;
    phone?: string;
    dob?: string;
    address?: any;
    status?: string;
}

@Injectable({
    providedIn: 'root'
})
export class UserService {

    constructor(
        private http: HttpClient,
        private stateService: StateService
    ) { }

    private mapBackendUserToModel(user: any): IUserModel {
        const roles = user.roles || [];
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            roles: roles,
            role: roles.map((r: any) => r.name).join(', '),
            avatar: user.id === 1 ? './assets/media/avatars/300-1.jpg' : user.id === 2 ? './assets/media/avatars/300-6.jpg' : './assets/media/avatars/300-20.jpg',
            created_at: user.created_at || new Date().toISOString(),
            last_login_at: user.last_login_at,
            username: user.username,
            phone: user.phone,
            dob: user.dob,
            address: user.address ? (typeof user.address === 'string' ? JSON.parse(user.address) : user.address) : {},
            status: user.status
        };
    }

    getUsers(dataTablesParameters: any): Observable<DataTablesResponse> {
        const start = dataTablesParameters?.start || 0;
        const length = dataTablesParameters?.length || 10;
        const draw = dataTablesParameters?.draw || 1;
        const search = dataTablesParameters?.search?.value || '';
        const roleFilter = dataTablesParameters?.roleFilter || '';

        return this.http.get<any>(`${environment.apiUrl}/usuarios`, {
            params: {
                start: start.toString(),
                length: length.toString(),
                draw: draw.toString(),
                search: search,
                roleFilter: roleFilter
            }
        }).pipe(
            map((res: any) => {
                const mappedData = (res.data || []).map((u: any) => this.mapBackendUserToModel(u));
                return {
                    draw: res.draw || draw,
                    recordsTotal: res.recordsTotal || 0,
                    recordsFiltered: res.recordsFiltered || 0,
                    data: mappedData
                };
            })
        );
    }

    getUser(id: number): Observable<IUserModel> {
        return this.http.get<any>(`${environment.apiUrl}/usuarios`, {
            params: { id: id.toString() }
        }).pipe(
            map((u: any) => this.mapBackendUserToModel(u))
        );
    }

    createUser(user: IUserModel): Observable<IUserModel> {
        const roleIds = user.roles ? user.roles.map(r => r.id) : [];
        const payload = {
            name: user.name,
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            password: user.password || 'Pujol2026!',
            roleIds: roleIds,
            username: user.username,
            phone: user.phone,
            dob: user.dob,
            address: user.address,
            status: user.status
        };
        return this.http.post<any>(`${environment.apiUrl}/usuarios`, payload).pipe(
            tap((res) => {
                if (res.success) {
                    this.stateService.loadUsers();
                    this.stateService.loadRoles();
                }
            }),
            map((res) => {
                return {
                    id: res.id || 0,
                    name: user.name,
                    email: user.email,
                    roles: user.roles || [],
                    role: (user.roles || []).map(r => r.name).join(', '),
                    avatar: './assets/media/avatars/300-20.jpg',
                    created_at: new Date().toISOString(),
                    username: user.username,
                    phone: user.phone,
                    dob: user.dob,
                    address: user.address,
                    status: user.status
                };
            })
        );
    }

    updateUser(id: number, user: IUserModel): Observable<IUserModel> {
        const roleIds = user.roles ? user.roles.map(r => r.id) : [];
        const payload = {
            id: +id,
            name: user.name,
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            password: user.password,
            roleIds: roleIds,
            username: user.username,
            phone: user.phone,
            dob: user.dob,
            address: user.address,
            status: user.status
        };
        return this.http.post<any>(`${environment.apiUrl}/usuarios`, payload).pipe(
            tap((res) => {
                if (res.success) {
                    this.stateService.loadUsers();
                    this.stateService.loadRoles();
                }
            }),
            map(() => {
                return {
                    id: +id,
                    name: user.name,
                    email: user.email,
                    roles: user.roles || [],
                    role: (user.roles || []).map(r => r.name).join(', '),
                    avatar: './assets/media/avatars/300-20.jpg',
                    created_at: user.created_at,
                    username: user.username,
                    phone: user.phone,
                    dob: user.dob,
                    address: user.address,
                    status: user.status
                };
            })
        );
    }

    deleteUser(id: number): Observable<void> {
        return this.http.delete<any>(`${environment.apiUrl}/usuarios`, {
            params: { id: id.toString() }
        }).pipe(
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