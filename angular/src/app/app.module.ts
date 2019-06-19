import { BrowserModule } from '@angular/platform-browser';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule} from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { ChartModule } from 'angular-highcharts';
import { AngularFontAwesomeModule } from 'angular-font-awesome';
import { MatTableModule } from '@angular/material';
import { MatPaginatorModule } from '@angular/material/paginator';
// import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';   
import { MatSortModule} from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';
import { InfoComponent } from './info/info.component';
import { EvaluationComponent } from './evaluation/evaluation.component';
import { FilterComponent } from './evaluation/filter/filter.component';
import { TimelineChartComponent } from './evaluation/filter/timeline-chart/timeline-chart.component';
import { FrequencyChartComponent } from './evaluation/filter/frequency-chart/frequency-chart.component';
import { MapChartComponent } from './evaluation/filter/map-chart/map-chart.component';
import { ErrorComponent } from './error.component';
import { FooterComponent } from './footer/footer.component';
import { BulletinComponent } from './bulletin/bulletin.component';
import { BulletinDetailComponent } from './bulletin-detail/bulletin-detail.component';
import { DownloadComponent } from './evaluation/download/download.component';
import { GeoDownloadComponent } from './info/geo-download/geo-download.component';
import { GeoDownloadDetailComponent } from './geo-download-detail/geo-download-detail.component';

import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { LanguageService } from './shared/language.service';
import { MatPaginatorIntl } from '@angular/material';
import { NgbDatepickerI18n } from '@ng-bootstrap/ng-bootstrap';
import { SparqlDataService } from './shared/sparql-data.service';
import { MatPaginatorI18nService} from './shared/mat-paginator-i18n.service'
import { DistributeDataService } from './shared/distribute-data.service';
import { DatePickerI18nService } from './shared/date-picker-i18n.service';
import { HighchartService } from './shared/highchart.service';
import { ParamService } from './shared/param.service';
import { ChDate } from './shared/pipes/ch-date.pipe';
import { NotificationService } from './shared/notification.service';


@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    InfoComponent,
    EvaluationComponent,
    FilterComponent,
    TimelineChartComponent,
    FrequencyChartComponent,
    MapChartComponent,
    ErrorComponent,
    FooterComponent,
    BulletinComponent,
    BulletinDetailComponent,
    DownloadComponent,
    GeoDownloadComponent,
    GeoDownloadDetailComponent,
    ChDate
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    ChartModule,
    FormsModule,
    NgSelectModule,
    AngularFontAwesomeModule,
    MatTableModule,
    MatPaginatorModule,
    //NoopAnimationsModule,
    MatSortModule,
    MatTooltipModule,
    NgbModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    }),
    BrowserAnimationsModule,
    ToastrModule.forRoot({
      disableTimeOut: true,
      positionClass:'toast-center-center',   
      enableHtml: true 
    })
  ],
  providers: [
    SparqlDataService,
    LanguageService,
    DistributeDataService,
    HighchartService,
    ParamService,
    {
      provide: MatPaginatorIntl,
      useClass: MatPaginatorI18nService,
    },
    {
      provide: NgbDatepickerI18n,
      useClass: DatePickerI18nService
    },
    NotificationService
  ],
  schemas: [
    CUSTOM_ELEMENTS_SCHEMA
],

  bootstrap: [AppComponent]
})
export class AppModule { }

// required for AOT compilation
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http);
}
