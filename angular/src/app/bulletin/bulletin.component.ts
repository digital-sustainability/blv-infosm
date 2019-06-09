import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatPaginator, MatTableDataSource, MatSort, MatSortable } from '@angular/material';
import { Report } from '../shared/models/report.model';
import { SparqlDataService } from 'src/app/shared/sparql-data.service';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from 'src/app/shared/language.service';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
dayjs.extend(weekOfYear);


@Component({
  selector: 'app-bulletin',
  templateUrl: './bulletin.component.html',
  styleUrls: ['./bulletin.component.css']
})

export class BulletinComponent implements OnInit, OnDestroy {

  @ViewChild('d') datepicker;
  @ViewChild('c') datepicker2;

  private _paramSub: Subscription;
  private _langSub: Subscription;
  private _dataSub: Subscription;
  private _paramState = {
    lang: '',
    from: '',
    to: ''
  };

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  dataSource: any;
  data: Report[];
  element_data: any[];
  displayedColumns: string[] = ['nummer', 'dateFrom', 'dateTo', 'action'];
  startIntervals = [];
  endIntervals = [];
  startOfBulletin = '2008-11-17';
  actionString = 'Details anzeigen'; // TODO: i18n
  distributedData = {};
  details: boolean;
  detailData; // TODO: types
  metaData = [];

  constructor(
    private _sparqlDataService: SparqlDataService,
    private _langauageService: LanguageService,
    private _router: Router,
    private _route: ActivatedRoute,
    public translateService: TranslateService,
  ) { }

  ngOnInit(): void {
    this._paramSub = this._route.queryParams.subscribe(
      params => {
        // Set parmas if none detected or one is misssing
        if (!params['lang'] || !params['from'] || !params['to']) {
          const lang = this.translateService.currentLang;
          const from = dayjs(this.startOfBulletin).format('YYYY-MM-DD');
          const to = dayjs().format('YYYY-MM-DD');
          this.updateRouteParams({
            lang: lang,
            from: from,
            to: to
          });
          // this.getList(lang, from, to);
          // set params and get data accordning to URL input
        } else {
          this._paramState.lang = params['lang'];
          this._paramState.from = params['from'];
          this._paramState.to = params['to'];
          // load data according to URL-input by user
          this.getList(this._paramState.lang, this._paramState.from, this._paramState.to);
          // in case the language in URL defers from the one currently set, change the langu
          if (this._paramState.lang !== this.translateService.currentLang) {
            this._langauageService.changeLang(this._paramState.lang);
          }
        }
        // If the languare changes through click, update param
        this._langSub = this._langauageService.currentLang.subscribe(
          lang => {
            if (this._paramState.lang !== lang) {
              // TODO: reset filter if language changes
              console.log('ParamState: ' + this._paramState.lang + ' ≠ languageService: ' + lang);
              this.updateRouteParams({ lang: lang });
            }
          }, err => {
            // TODO: Imporve error handling
            console.log(err);
          }
        );
      }
    );
  }

  ngOnDestroy(): void {
    this._paramSub.unsubscribe();
    this._dataSub.unsubscribe();
    this._langSub.unsubscribe();
  }

  private getList(lang: string, from: string | Date, to: string | Date): void {
    this._dataSub = this._sparqlDataService.getReports(lang, from, to).subscribe(
      (data: Report[]) => {
        this.data = this.beautifyDataObject(data);
        this.splitDataToIntervals(from, to);
        console.log(this.data);

        // Prepare data for table
        this.element_data = [];
        this.transformDataToMaterializeTable();
        this.dataSource = new MatTableDataSource<any>(this.element_data);
        this.dataSource.paginator = this.paginator;
        // change the default ordering of the table
        this.sort.sort(<MatSortable>{
          id: 'nummer', // TODO: i18n?
          start: 'desc'
        });
        this.dataSource.sort = this.sort;
        this.distributeDataToIntervals();
      }, err => {
        console.log(err);
        // TODO: Imporve error handling
      });
  }

  private splitDataToIntervals(startDate: Date | string, endDate: Date | string) {
    let tmpDate = startDate;
    while (tmpDate <= endDate) {
      this.startIntervals.push(tmpDate);
      this.endIntervals.push(dayjs(tmpDate).add(6, 'day').format('YYYY-MM-DD'));
      tmpDate = dayjs(tmpDate).add(1, 'week').format('YYYY-MM-DD');
    }
  }

  private constructNumber(date: Date | string): string {
    const year = dayjs(date).year();
    const week = dayjs(date).week();
    const result = (week < 10) ? `${year}0${week}` : `${year}${week}`;
    return result;
  }

  private transformDataToMaterializeTable(): void {
    for (let i = 0; i <= this.endIntervals.length - 1; i++) {
      this.element_data.push({
        nummer: this.constructNumber(this.startIntervals[i]),
        dateFrom: this.startIntervals[i],
        dateTo: this.endIntervals[i],
        action: `${this.actionString}`
      });
    }
  }

  private beautifyDataObject(data: any[]) {
    const reducedDataObject: any[] = [];
    for (const el in data) {
      if (data[el]) {
        reducedDataObject.push({
          diagnose_datum: data[el].diagnose_datum.value,
          kanton: data[el].kanton.value,
          gemeinde: data[el].gemeinde.value,
          seuche: data[el].seuche.value,
          seuchen_gruppe: data[el].seuchen_gruppe.value,
          tierart: data[el].tierart.value
        });
      }
    }
    return reducedDataObject.sort((a, b) => {
      const adate = new Date(a['diagnose_datum']);
      const bdate = new Date(b['diagnose_datum']);
      return (adate < bdate) ? -1 : (adate > bdate) ? 1 : 0;
    });
  }

  // distribute the data into the weekly intervals from the table
  // returns an object key: number(vgl table) and value: array of objects which fall into the weelky interval 
  private distributeDataToIntervals(): void {
    const res = {};
    let counter = 0;
    for (const o of this.data) {
      if (o['diagnose_datum'] <= this.element_data[counter]['dateTo']) {
        if (!res[this.element_data[counter]['nummer']]) {
          res[this.element_data[counter]['nummer']] = [];
        }
        res[this.element_data[counter]['nummer']].push(o);
      } else {
        while (o['diagnose_datum'] >= this.element_data[counter]['dateTo']) {
          counter++;
          if (o['diagnose_datum'] <= this.element_data[counter]['dateTo']) {
            if (!res[this.element_data[counter]['nummer']]) {
              res[this.element_data[counter]['nummer']] = [];
            }
            res[this.element_data[counter]['nummer']].push(o);
          } else {
            res[this.element_data[counter]['nummer']] = [];
          }
        }
      }
    }
    this.distributedData = res;
  }

  private findNumberIdInDataObject(object: object, id: number) {
    let tmpObj = {};
    if (object.hasOwnProperty(id)) {
      tmpObj = object[id];
      return tmpObj;
    } else {
      console.log(id + ' not found in the object'); // TODO: Handle this error. What happens if no object returned?
    }
  }

  goToDetail(id: number, datefrom: string | Date, dateTo: string | Date): void {
    console.log('Hello Detail ID:' + id);
    this.metaData.push([id, datefrom, dateTo]);
    this.detailData = this.findNumberIdInDataObject(this.distributedData, id);
    localStorage.setItem('metaData', JSON.stringify(this.metaData));
    localStorage.setItem('detailData', JSON.stringify(this.detailData));
    this._router.navigate(['bulletin/detail', { number: id }]);
  }

  getFromToDates(): void {
    this.data = [];
    this.startIntervals = [];
    this.endIntervals = [];
    const from = this.datepicker._inputValue;
    const to = this.datepicker2._inputValue;
    this.getList(this._paramState.lang, from, to);
  }

  resetDates(): void {
    this.data = [];
    this.startIntervals = [];
    this.endIntervals = [];
    this.getList(
      this._paramState.lang,
      dayjs(this.startOfBulletin).format('YYYY-MM-DD'),
      dayjs().format('YYYY-MM-DD')
    );
  }


  // update the route without having to reset all other route properties. all others stay untouched
  private updateRouteParams(changes: { [s: string]: string; }): void {
    let paramsChanged = false;
    for (const key in changes) {
      // update the paramstate if there have been any changes
      if (this._paramState.hasOwnProperty(key) && changes[key] !== this._paramState[key]) {
        this._paramState[key] = changes[key];
        paramsChanged = true;
      }
    }
    // get data if any params have changed
    console.log(paramsChanged, 'paramschanged')
    if (paramsChanged) {
      this.getList(this._paramState.lang, this._paramState.from, this._paramState.to);
    }
    // set the params in the router
    this._router.navigate(
      [], {
        queryParams: this._paramState,
        relativeTo: this._route // stay on current route
      });
  }
}
