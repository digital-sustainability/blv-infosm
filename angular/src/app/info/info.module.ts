import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InfoComponent } from './info.component';
import { InfoRoutingModule } from './info-routing.module';
import { GeoDownloadComponent } from './geo-download/geo-download.component';
import { GeoDownloadDetailComponent } from './geo-download-detail/geo-download-detail.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';



@NgModule({
  declarations: [
    InfoComponent,
    GeoDownloadComponent,
    GeoDownloadDetailComponent
  ],
  imports: [
    CommonModule,
    InfoRoutingModule,
    MatIconModule,
    TranslateModule.forChild()
  ]
})
export class InfoModule { }
