import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { MatPaginator, MatTableDataSource, MatSort, MatSortable } from '@angular/material';
import { Location } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { LanguageService } from '../shared/language.service';
import { ActivatedRoute, Router } from '@angular/router';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { SparqlDataService } from '../shared/sparql-data.service';
import { Report } from '../shared/models/report.model';
dayjs.extend(weekOfYear);

@Component({
  selector: 'app-bulletin-detail',
  templateUrl: './bulletin-detail.component.html',
  styleUrls: ['./bulletin-detail.component.css']
})
export class BulletinDetailComponent implements OnInit, OnDestroy {

  private _langSub: Subscription;
  private _dataSub: Subscription;

  dataFromRoute;
  metaDataFromRoute;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  dataSource: any;
  element_data: any;
  displayedColumns: string[] = [ 'kanton', 'gemeinde', 'seuchen_gruppe', 'seuche', 'tierart', 'anzahl' ];
  from: string;


  constructor(
    private _location: Location,
    private _route: ActivatedRoute,
    private _langauageService: LanguageService,
    private _sparqlDataService: SparqlDataService,
    public translateService: TranslateService,
  ) { }

  ngOnInit() {
    const lang = this._route.snapshot.paramMap.get('lang');
    const from = this._route.snapshot.paramMap.get('from');
    const to = this._route.snapshot.paramMap.get('to');
    // Get the data according to params
    this.getList(lang, from, to);
    // If the language changes through click, update param
    this._langSub = this._langauageService.currentLang.subscribe(
      language => {
        if (language !== lang) {
          this.getList(language, from, to);
        }
      }, err => {
        // TODO: Imporve error handling
        console.log(err);
      }
    );



    this.dataFromRoute = JSON.parse(localStorage.getItem('detailData'));
    this.metaDataFromRoute = JSON.parse(localStorage.getItem('metaData'));
    console.log(this.dataFromRoute);

    this.element_data = [];

    this.transformDataToMaterializeTable();

    this.dataSource = new MatTableDataSource<any>(this.element_data);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  ngOnDestroy(): void {
    this._dataSub.unsubscribe();
    this._langSub.unsubscribe();
  }

  onGoBack(): void {
    this._location.back();
  }

  // TODO: Meldedatum hinzufügen
  private transformDataToMaterializeTable() {
    for (const element in this.dataFromRoute) {
      if (this.dataFromRoute[element]) {
        this.element_data.push({
          kanton: this.dataFromRoute[element].kanton,
          gemeinde: this.dataFromRoute[element].gemeinde,
          seuche: this.dataFromRoute[element].seuche,
          seuchen_gruppe: this.dataFromRoute[element].seuchen_gruppe,
          tierart: this.dataFromRoute[element].tierart,
          anzahl: 1
        });
      }
    }
  }

  private getList(lang: string, from: string | Date, to: string | Date): void {
    this._dataSub = this._sparqlDataService.getReports(lang, from, to).subscribe(
      (data: Report[]) => {
        // TODO: new data but no beatified. This should happen in the service
        console.log(data);
      },
      err => console.log(err)
    );
  }

}
