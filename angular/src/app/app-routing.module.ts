import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ErrorComponent } from './error.component';
import { EvaluationComponent } from './evaluation/evaluation.component';
import { FrequencyChartComponent } from './evaluation/filter/frequency-chart/frequency-chart.component';
import { TimelineChartComponent } from './evaluation/filter/timeline-chart/timeline-chart.component';
import { MapChartComponent } from './evaluation/filter/map-chart/map-chart.component';
import { BulletinComponent } from './bulletin/bulletin.component';

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
    path: 'info',
    loadChildren: () => import('./info/info.module').then(m => m.InfoModule)
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
