import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService, UserType } from '../auth';
import { PageInfoService } from '../../_metronic/layout/core/page-info.service';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
})
export class AccountComponent implements OnInit {
  user$: Observable<UserType>;

  constructor(private auth: AuthService, private pageInfo: PageInfoService) {}

  ngOnInit(): void {
    this.user$ = this.auth.currentUserSubject.asObservable();
    this.pageInfo.updateTitle('Mi Perfil');
  }
}
