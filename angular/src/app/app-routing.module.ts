import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { InfoComponent } from './info/info.component';
import { ErrorComponent } from './error.component';
import { EvaluationComponent } from './evaluation/evaluation.component';
import { FrequencyChartComponent } from './evaluation/filter/frequency-chart/frequency-chart.component';
import { TimelineChartComponent } from './evaluation/filter/timeline-chart/timeline-chart.component';
import { MapChartComponent } from './evaluation/filter/map-chart/map-chart.component';
import { BulletinComponent } from './bulletin/bulletin.component';
import { GeoDownloadDetailComponent } from './geo-download-detail/geo-download-detail.component';

const routes: Routes = [
  {
    path: 'evaluation',
    component: EvaluationComponent,
    children: [
      { path: '', redirectTo: 'timeline', pathMatch: 'full' },
      { path: 'timeline', component: TimelineChartComponent },
      { path: 'frequency', component: FrequencyChartComponent },
      { path: 'map', component: MapChartComponent }
    ]
  },
  {
    path: 'bulletin',
    component: BulletinComponent,
    pathMatch: 'full'
  },
  {
    path: 'geo-download',
    component: GeoDownloadDetailComponent,
    pathMatch: 'full'
  },
  {
    path: 'info',
    component: InfoComponent,
    pathMatch: 'full'
  },
  {
    path: '',
    redirectTo: 'evaluation',
    pathMatch: 'full'
  },
  {
    path: '**',
    component: ErrorComponent
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
