import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ErrorComponent } from './error.component';
import { EvaluationComponent } from './evaluation/evaluation.component';
import { FrequencyChartComponent } from './evaluation/filter/frequency-chart/frequency-chart.component';
import { TimelineChartComponent } from './evaluation/filter/timeline-chart/timeline-chart.component';
import { MapChartComponent } from './evaluation/filter/map-chart/map-chart.component';
import { BulletinComponent } from './bulletin/bulletin.component';
import { BulletinDetailViewComponent} from './bulletin-detail-view/bulletin-detail-view.component';

const routes: Routes = [
  {
    path: 'evaluation',
    component: EvaluationComponent,
    children: [
      { path: '', redirectTo: 'map', pathMatch: 'full' },
      { path: 'frequency', component: FrequencyChartComponent },
      { path: 'timeline', component: TimelineChartComponent },
      { path: 'map', component: MapChartComponent }
    ]
  },
  {
    path: 'bulletin',
    component: BulletinComponent,
    pathMatch: 'full'
  },
  {
    path: 'bulletin/details',
    component: BulletinDetailViewComponent,
    pathMatch: 'full'
  },
  {
    path: 'info',
    component: HomeComponent,
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
