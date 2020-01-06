import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { InfoComponent } from './info.component';
import { GeoDownloadDetailComponent } from './geo-download-detail/geo-download-detail.component';


const routes: Routes = [
  {
    path: '',
    component: InfoComponent
  },
  {
    path: 'geo-download',
    component: GeoDownloadDetailComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InfoRoutingModule { }
