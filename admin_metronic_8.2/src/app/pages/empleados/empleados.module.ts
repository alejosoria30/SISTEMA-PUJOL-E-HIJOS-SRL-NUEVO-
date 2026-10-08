import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmpleadosComponent } from './empleados.component';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from 'src/app/_metronic/shared/shared.module';

@NgModule({
  declarations: [EmpleadosComponent],
  imports: [
    CommonModule,
    FormsModule,
    NgbTooltipModule,
    SharedModule,
    RouterModule.forChild([
      {
        path: '',
        component: EmpleadosComponent
      }
    ])
  ]
})
export class EmpleadosModule { }
