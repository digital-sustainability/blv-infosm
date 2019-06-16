import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { MatPaginator, MatTableDataSource, MatSort, MatSortable } from '@angular/material';
import { Report } from '../shared/models/report.model';
import { ParamState } from '../shared/models/param-state.model';
import { SparqlDataService } from 'src/app/shared/sparql-data.service';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from 'src/app/shared/language.service';
import { Router, ActivatedRoute } from '@angular/router';
import { NgbDate } from '../shared/models/ngb-date.model';
import { Subscription } from 'rxjs';
import { ParamService } from '../shared/param.service';
import { NgbDateParserFormatter, NgbDateStruct, NgbDatepicker } from '@ng-bootstrap/ng-bootstrap';
import { NgbDateCHFormatter } from '../shared/formatters/ngb-ch-date-formatter';
import { inRange } from 'lodash';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
dayjs.extend(weekOfYear);


@Component({
  selector: 'app-bulletin',
  templateUrl: './bulletin.component.html',
  styleUrls: ['./bulletin.component.css'],
  providers: [{provide: NgbDateParserFormatter, useClass: NgbDateCHFormatter}]
})

export class BulletinComponent implements OnInit, OnDestroy {

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  from: NgbDate;
  to: NgbDate;

  fromDate: string | Date;
  toDate: string | Date;

  private _paramSub: Subscription;
  private _langSub: Subscription;
  private _dataSub: Subscription;
  private _paramState: ParamState;

  data: Report[];
  model: NgbDateStruct;
  maxDate : NgbDateStruct;
  startDate: NgbDateStruct;
  displayedCols: string[] = ['diagnose_datum', 'kanton', 'gemeinde', 'seuchen_gruppe', 'seuche', 'tierart', 'anzahl'];
  bulletinNumber: string;
  bulletinEntries: Report[];
  dataS: MatTableDataSource<[]>;
  actualBulletin: boolean= true;


  constructor(
    private _sparqlDataService: SparqlDataService,
    private _langauageService: LanguageService,
    private _router: Router,
    private _paramsService: ParamService,
    private _route: ActivatedRoute,
    public translateService: TranslateService,
  ) { }

  ngOnInit(): void {

    // max possible date is today
    this.maxDate = this.transformDate(dayjs().day(0).format("YYYY-MM-DD"));
    // the start date is the actual bulletin from last week
    this.startDate = this.transformDate(dayjs().subtract(7, 'd').format("YYYY-MM-DD"));
    // start by setting the model of the date picker to the start date
    this.model = this.startDate;

    this._paramState = { lang: '', from: '', to: '' };
    this._paramSub = this._route.queryParams.subscribe(
      params => {
        // set parmas if none detected or one is misssing
        if (!params['lang'] || !params['from'] || !params['to']) {
          this.updateInput({
            lang: this.translateService.currentLang,
            from: dayjs().subtract(7, 'd').format("YYYY-MM-DD"),
            to: dayjs().format('YYYY-MM-DD')
          }, this._paramState);
        // set params and get data accordning to URL input
        } else {
          // load data according to URL-input by user
          this.updateInput({
            lang: params['lang'],
            from: params['from'],
            to: params['to']
          }, this._paramState);

          // in case the language in URL defers from the one currently set, change the language
           // TODO: Check if this logic makes sense or needed at all. Also in Bulletin-detail
          if (this._paramState.lang !== this.translateService.currentLang) {
            this._langauageService.changeLang(this._paramState.lang);
          }
        }
        // If the language changes through click, update param
        this._langSub = this._langauageService.currentLang.subscribe(
          lang => {
            if (this._paramState.lang !== lang) {
              // TODO: reset filter if language changes
              console.log('ParamState: ' + this._paramState.lang + ' ≠ languageService: ' + lang);
              this.updateInput({ lang: lang }, this._paramState);
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

  getDate(): void {
    const selectedDate = this.model.year + '-' + this.model.month + '-' + this.model.day;
    this.actualBulletin = this.checkActualBulletin(selectedDate);
    this.fromDate = dayjs(selectedDate, "YYYY-MM-DD").day(1).format("YYYY-MM-DD");
    this.toDate = dayjs(selectedDate, "YYYY-MM-DD").day(7).format("YYYY-MM-DD");
    this.bulletinNumber = this.constructNumber(selectedDate);
    this.updateInput({
      lang: this.translateService.currentLang,
      from: this.fromDate,
      to: this.toDate
    }, this._paramState);
    this.bulletinEntries = this.searchEntries(this.fromDate, this.toDate, this.data);
    this.constructTable(this.bulletinEntries);
  }

  private checkActualBulletin(selectedDate: string | Date): boolean {
    const today = dayjs(new Date()).subtract(7, 'd').format("YYYY-MM-DD");
    const from =  dayjs(today).day(1).format("YYYY-MM-DD");
    const to = dayjs(today).day(7).format("YYYY-MM-DD");
    return ( dayjs(selectedDate).isBefore(to) && dayjs(selectedDate).isAfter(from) );
  }

  private searchEntries(from: string | Date, to: string | Date, data: Report[]): Report[] {
    let parsedFromDate = this.dateToInt(from);
    let parsedToDate = this.dateToInt(to);
    let foundEntriesOfBulletin: Report[] = [];
    for (const entry of data) {
      let parsedDateOfEntry = this.dateToInt(entry['diagnose_datum']);
      if( inRange(parsedDateOfEntry, parsedFromDate, parsedToDate) ) {
        entry.anzahl = 1;
        foundEntriesOfBulletin.push(entry);
      } 
    }
    return this.countOccuranceInBulletin(foundEntriesOfBulletin);
  }

  private countOccuranceInBulletin(bulletinEntries: Report[]) {
    if(!bulletinEntries || bulletinEntries.length === 0) {
      return [];
    }
    let tmp = bulletinEntries;
    const entriesToRemove = [];
    const countedBulletinEntries: Report[] = [];
    bulletinEntries.forEach((entry) => {
      let count = 0;
      tmp.forEach((el) => {
        if(this.isEquivalentEntry(entry, el)) {
          if(entry !== el) {
            entriesToRemove.push(el);
          };
          count++;
        }
      });
      entry['anzahl'] = count;
      tmp = tmp.filter((el) => {
        return !entriesToRemove.includes(el);
      });
      if(!entriesToRemove.includes(entry))
        countedBulletinEntries.push(entry);
    });
    return countedBulletinEntries;
  }

  private isEquivalentEntry(a, b): boolean {
    return (JSON.stringify(a) === JSON.stringify(b)) ? true : false;
}

  private dateToInt(date: string | Date): number {
    return parseInt(date.toString().split("-").join(""));
  }

  private constructTable(bulletinEntries: Report[]): void {
    this.dataS = new MatTableDataSource<any>(bulletinEntries);
    this.dataS.paginator = this.paginator;
    this.sort.sort(<MatSortable>{
      id: 'number', 
      start: 'desc'
    });
    this.dataS.sort = this.sort;
  }

  private getList(lang: string, from: string | Date, to: string | Date):void {
    this._dataSub = this._sparqlDataService.getReports(lang, from, to).subscribe(
      (data: Report[]) => {
        this.data = this.beautifyDataObject(data);
        this.getDate();
      }, err => {
        console.log(err);
        // TODO: Imporve error handling
      });
  }

  private constructNumber(date: Date | string): string {
    const year = dayjs(date).year();
    const week = dayjs(date).week();
    const result = (week < 10) ? `${year}0${week}` : `${year}${week}`;
    return result;
  }

  // TODO: Enforce typing. Solve the "Report-type-mess"
  // TODO: Maybe we can increase performance by moving the "clean data" part to the sparql-service
  private beautifyDataObject(data: Report[]): Report[] {
    const reducedDataObject = [];
    for (const el in data) {
      if (data[el]) {
        reducedDataObject.push({
          diagnose_datum: data[el].diagnose_datum['value'],
          kanton: data[el].kanton['value'],
          gemeinde: data[el].gemeinde['value'],
          seuche: data[el].seuche['value'],
          seuchen_gruppe: data[el].seuchen_gruppe['value'],
          tierart: data[el].tierart['value']
        });
      }
    }
    return reducedDataObject.sort((a, b) => {
      const adate = new Date(a['diagnose_datum']);
      const bdate = new Date(b['diagnose_datum']);
      return (adate < bdate) ? -1 : (adate > bdate) ? 1 : 0;
    });
  }

  private updateInput(changes: { [s: string]: string; }, oldState: ParamState): void {
    // check if old an new state are the same
    if (JSON.stringify(changes) !== JSON.stringify(oldState)) {
       this._paramState = this._paramsService.updateRouteParams(changes, oldState);
       this.getList(this._paramState.lang, this._paramState.from, this._paramState.to);
    }
  }

  private transformDate(date: string | Date): NgbDate {
    const d = new Date(date);
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  }
}

// OLD CODE:

// element_data: any[];
  // //displayedColumns: string[] = ['number', 'dateFrom', 'dateTo', 'action'];
  // startIntervals = [];
  // endIntervals = [];
  // startOfBulletin = '2008-11-17';
  // actionString = 'Details anzeigen'; // TODO: i18n
  // distributedData = {};
  // details: boolean;
  // detailData; // TODO: types
  // metaData = [];

// update the values in the two date-pickers
        // this.from = this.transformDate(from);
        // this.to = this.transformDate(to);

        // Prepare data for table
        // this.element_data = [];
        // this.transformDataToMaterializeTable();
        // this.dataSource = new MatTableDataSource<any>(this.element_data);
        // this.dataSource.paginator = this.paginator;
        // // change the default ordering of the table
        // this.sort.sort(<MatSortable>{
        //   id: 'number', 
        //   start: 'desc'
        // });
        // this.dataSource.sort = this.sort;
        //this.distributeDataToIntervals();
        
   // private transformDataToMaterializeTable(): void {
  //   for (let i = 0; i <= this.endIntervals.length - 1; i++) {
  //     this.element_data.push({
  //       nummer: this.constructNumber(this.startIntervals[i]),
  //       dateFrom: this.startIntervals[i],
  //       dateTo: this.endIntervals[i],
  //       action: this.actionString
  //     });
  //   }
  // }

  // creates two arrays of start and end dates
  // private splitDataToIntervals(startDate: Date | string, endDate: Date | string) {
  //   let tmpDate = startDate;
  //   while (tmpDate <= endDate) {
  //     this.startIntervals.push(tmpDate);
  //     this.endIntervals.push(dayjs(tmpDate).add(6, 'day').format('YYYY-MM-DD'));
  //     tmpDate = dayjs(tmpDate).add(1, 'week').format('YYYY-MM-DD');
  //   }
  // }

  // private retransformDate(date: string | Date): string {
  //   return date.toString().split('.').reverse().join("-");
  // }

  // distribute the data into the weekly intervals from the table
  // returns an object key: number(vgl table) and value: array of objects which fall into the weelky interval
  // private distributeDataToIntervals(): void {
  //   const res = {};
  //   let counter = 0;
  //   for (const o of this.data) {
  //     if (o['diagnose_datum'] <= this.element_data[counter]['dateTo']) {
  //       if (!res[this.element_data[counter]['nummer']]) {
  //         res[this.element_data[counter]['nummer']] = [];
  //       }
  //       res[this.element_data[counter]['nummer']].push(o);
  //     } else {
  //       while (o['diagnose_datum'] >= this.element_data[counter]['dateTo']) {
  //         counter++;
  //         if (o['diagnose_datum'] <= this.element_data[counter]['dateTo']) {
  //           if (!res[this.element_data[counter]['nummer']]) {
  //             res[this.element_data[counter]['nummer']] = [];
  //           }
  //           res[this.element_data[counter]['nummer']].push(o);
  //         } else {
  //           res[this.element_data[counter]['nummer']] = [];
  //         }
  //       }
  //     }
  //   }
  //   this.distributedData = res;
  // }

  // private findNumberIdInDataObject(object: object, id: number) {
  //   let tmpObj = {};
  //   if (object.hasOwnProperty(id)) {
  //     tmpObj = object[id];
  //     return tmpObj;
  //   } else {
  //     console.log(id + ' not found in the object'); // TODO: Handle this error. What happens if no object returned?
  //   }
  // }

  // goToDetail(id: number, bulletinFrom: string | Date, bulletinTo: string | Date): void {
  //   console.log('Hello Detail ID:' + id);
  //   this.metaData.push([id, bulletinFrom, bulletinTo]);
  //   this.detailData = this.findNumberIdInDataObject(this.distributedData, id);
  //   localStorage.setItem('metaData', JSON.stringify(this.metaData));
  //   localStorage.setItem('detailData', JSON.stringify(this.detailData));
  //   this._router.navigate([
  //     'bulletin/detail',
  //     this._paramState.lang,
  //     bulletinFrom,
  //     bulletinTo
  //   ]);
  // }

  // getFromToDates(): void {
  //   this.data = [];
  //   this.startIntervals = [];
  //   this.endIntervals = [];
  //   const from = this.retransformDate(this.datepickerFrom._inputValue);
  //   const to = this.retransformDate(this.datepickerTo._inputValue);
  //   this.updateInput({ from: from, to: to }, this._paramState);
  // }

  // resetDates(): void {
  //   this.data = [];
  //   this.startIntervals = [];
  //   this.endIntervals = [];
  //   this.updateInput({
  //     from: dayjs(this.startOfBulletin).format('YYYY-MM-DD'),
  //     to: dayjs().format('YYYY-MM-DD')
  //   }, this._paramState);
  // }