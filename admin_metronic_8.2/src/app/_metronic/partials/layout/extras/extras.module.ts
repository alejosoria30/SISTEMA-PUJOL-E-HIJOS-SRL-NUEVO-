import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule} from '@angular/router';
import {InlineSVGModule} from 'ng-inline-svg-2';
import {NotificationsInnerComponent} from './dropdown-inner/notifications-inner/notifications-inner.component';
import {UserInnerComponent} from './dropdown-inner/user-inner/user-inner.component';
import {LayoutScrollTopComponent} from './scroll-top/scroll-top.component';
import {TranslationModule} from '../../../../modules/i18n';
import {NgbTooltipModule} from "@ng-bootstrap/ng-bootstrap";
import {FormsModule} from "@angular/forms";
import { SharedModule } from "../../../shared/shared.module";

@NgModule({
  declarations: [
    NotificationsInnerComponent,
    UserInnerComponent,
    LayoutScrollTopComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    InlineSVGModule,
    RouterModule,
    TranslationModule,
    NgbTooltipModule,
    SharedModule
  ],
  exports: [
    NotificationsInnerComponent,
    UserInnerComponent,
    LayoutScrollTopComponent,
  ],
})
export class ExtrasModule {
}
