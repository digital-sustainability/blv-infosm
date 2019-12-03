import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortable } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Report } from '../shared/models/report.model';
import { ParamState } from '../shared/models/param-state.model';
import { SparqlDataService } from 'src/app/shared/services/sparql-data.service';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from 'src/app/shared/services/language.service';
import { NotificationService } from '../shared/services/notification.service';
import { ActivatedRoute } from '@angular/router';
import { NgbDateParserFormatter, NgbDate, NgbDateStruct} from '@ng-bootstrap/ng-bootstrap';
import { NgbDateCHFormatter } from '../shared/formatters/ngb-ch-date-formatter';
import { inRange } from 'lodash';
import { ParamService } from '../shared/services/param.service';
import { SubscriptionManagerService } from '../shared/services/subscription-manager.service';
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

  @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: false }) sort: MatSort;

  hoveredDate: NgbDate;
  from: NgbDate;
  to: NgbDate;
  noData: boolean;

  fromDate: string | Date;
  toDate: string | Date;

  private _paramState: ParamState;

  data: Report[];
  // model: NgbDateStruct;
  // startDate: NgbDateStruct;
  maxDate: NgbDateStruct;
  selectedDate: NgbDateStruct;
  displayedCols = ['publication_date', 'canton', 'munic', 'epidemic_group', 'epidemic', 'animal_species', 'count'];
  bulletinNumber: string;
  bulletinEntries: Report[];
  dataS: MatTableDataSource<[]>;
  actualBulletin = true;


  constructor(
    private _sparqlDataService: SparqlDataService,
    private _langauageService: LanguageService,
    private _paramsService: ParamService,
    private _route: ActivatedRoute,
    private _notification: NotificationService,
    private _subscriptionManagerService: SubscriptionManagerService,
    public translateService: TranslateService,
  ) { }

  ngOnInit(): void {
    // max possible date is today
    this.maxDate = this.transformDate(dayjs().day(0).format('YYYY-MM-DD'));
    // the start date is the actual bulletin from last week
    this.selectedDate = this.transformDate(dayjs().subtract(7, 'd').format('YYYY-MM-DD'));
    // start by setting the model of the date picker to the start date
    // this.model = this.startDate;

    this._paramState = { lang: '', from: '', to: '' };
    this._subscriptionManagerService.add(
      this._route.queryParams.subscribe(
        params => {
          // set parmas if none detected or one is misssing
          if (!params['lang'] || !params['from'] || !params['to']) {
            this.updateInput({
              lang: this.translateService.currentLang,
              from: dayjs().subtract(7, 'd').format('YYYY-MM-DD'),
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
          this._langauageService.currentLang.subscribe(
            lang => {
              if (this._paramState.lang !== lang) {
                this.updateInput({ lang: lang }, this._paramState);
              }
            }, err => {
              // TODO: Imporve error handling
              this._notification.errorMessage(err.statusText + '<br>' + 'language error', err.name);
            }
          );
        }
      )
    );
  }

  ngOnDestroy(): void {
    this._subscriptionManagerService.unsubscribe();
  }

  onDateSelection(date: NgbDate) {
    this.updateDatesAndData(date);
  }

  updateDatesAndData(model: any): void {
    const selectedDate = model.year + '-' + model.month + '-' + model.day;
    this.actualBulletin = this.checkActualBulletin(selectedDate);
    this.fromDate = dayjs(selectedDate, 'YYYY-MM-DD').day(1).format('YYYY-MM-DD');
    this.toDate = dayjs(selectedDate, 'YYYY-MM-DD').day(7).format('YYYY-MM-DD');
    this.from = this.transformDate(this.fromDate);
    this.to = this.transformDate(this.toDate);
    this.bulletinNumber = this.constructNumber(selectedDate);
    this.updateInput({
      lang: this.translateService.currentLang,
      from: this.fromDate,
      to: this.toDate
    }, this._paramState);
    this.bulletinEntries = this.searchEntries(this.fromDate, this.toDate, this.data);
    this.constructTable(this.bulletinEntries);
  }

  onScrollUp(): void {
    window.scrollTo(0, 0);
  }

  private checkActualBulletin(selectedDate: string | Date): boolean {
    const today = dayjs(new Date()).subtract(7, 'd').format('YYYY-MM-DD');
    const from =  dayjs(today).day(1).format('YYYY-MM-DD');
    const to = dayjs(today).day(7).format('YYYY-MM-DD');
    return ( (dayjs(selectedDate).isBefore(to) || dayjs(selectedDate).isSame(to) )
                && ( dayjs(selectedDate).isAfter(from) ||  dayjs(selectedDate).isSame(from) ) );
  }

  private searchEntries(from: string | Date, to: string | Date, data: Report[]): Report[] {
    const parsedFromDate = this.dateToInt(from);
    const parsedToDate = this.dateToInt(to);
    const foundEntriesOfBulletin: Report[] = [];
    for (const entry of data) {
      const parsedDateOfEntry = this.dateToInt(entry['publication_date']);
      if (inRange(parsedDateOfEntry, parsedFromDate, parsedToDate)) {
        entry.count = 1;
        foundEntriesOfBulletin.push(entry);
      }
    }
    return this.countOccuranceInBulletin(foundEntriesOfBulletin);
  }

  private countOccuranceInBulletin(bulletinEntries: Report[]): Report[] {
    if (!bulletinEntries || bulletinEntries.length === 0) {
      return [];
    }
    let tmp = bulletinEntries;
    const entriesToRemove = [];
    const countedBulletinEntries: Report[] = [];
    bulletinEntries.forEach(entry => {
      let count = 0;
      tmp.forEach((el) => {
        if (this.isEquivalentEntry(entry, el)) {
          if (entry !== el) {
            entriesToRemove.push(el);
          }
          count++;
        }
      });
      entry['count'] = count;
      tmp = tmp.filter((el) => {
        return !entriesToRemove.includes(el);
      });
      if (!entriesToRemove.includes(entry)) {
        countedBulletinEntries.push(entry);
      }
    });
    return countedBulletinEntries;
  }

  isHovered(date: NgbDate) {
    return this.from && !this.to && this.hoveredDate && date.after(this.from) && date.before(this.hoveredDate);
  }

  isInside(date: NgbDate) {
    return date.after(this.from) && date.before(this.to);
  }

  isRange(date: NgbDate) {
    return date.equals(this.from) || date.equals(this.to) || this.isInside(date) || this.isHovered(date);
  }

  private isEquivalentEntry(a, b): boolean {
    return ( JSON.stringify(a) === JSON.stringify(b) );
}

  private dateToInt(date: string | Date): number {
    return parseInt(date.toString().split('-').join(''), 10);
  }

  private constructTable(bulletinEntries: Report[]): void {
    this.dataS = new MatTableDataSource<any>(bulletinEntries);
    this.dataS.paginator = this.paginator;
    if (this.bulletinEntries.length > 0) {
      this.sort.sort(<MatSortable>{
        id: 'publication_date',
        start: 'desc'
      });
    }
    this.dataS.sort = this.sort;
  }

  /**
   * Main data retrieval method. Query data as `Report` from remote endpoint.
   * The received data is transfomed into a more descriptive collection.
   *
   * @param lang Language in which the data is queried
   * @param from Date from which on the disease was published
   * @param to Date to which the disease might have been published
   */
  private getList(lang: string, from: string | Date, to: string | Date): void {
    this._subscriptionManagerService.add(
      this._sparqlDataService.getReports('publikations_datum', lang, from, to).subscribe(
        data => {
          this.noData = data.length === 0;
          this.data = this.beautifyDataObject(
            data.map(report => {
              return {
                publication_date: report.publikations_datum.value,
                canton: report.kanton.value,
                munic: report.gemeinde.value,
                epidemic_group: report.seuchen_gruppe.value,
                epidemic: report.seuche.value,
                animal_group: report.tier_gruppe.value,
                animal_species: report.tierart.value
              } as Report;
            })
          );
          this.updateDatesAndData(this.selectedDate);
        }, err => {
          // TODO: Imporve error handling
          this._notification.errorMessage(err.statusText + '<br>' + 'reports error', err.name);
          console.log(err);
        }
      )
    );
  }

  private constructNumber(date: Date | string): string {
    const year = dayjs(date).year();
    const week = dayjs(date).week();
    const result = (week < 10) ? `${year}0${week}` : `${year}${week}`;
    return result;
  }

  private beautifyDataObject(data: Report[]): Report[] {
    return data.sort((a, b) => {
      const adate = new Date(a['publication_date']);
      const bdate = new Date(b['publication_date']);
      return (adate < bdate) ? -1 : (adate > bdate) ? 1 : 0;
    });
  }

  private updateInput(changes: { [s: string]: string; }, oldState: ParamState): void {
    if (JSON.stringify(changes) !== JSON.stringify(oldState)) {
       this._paramState = this._paramsService.updateRouteParams(changes, oldState);
       this.getList(this._paramState.lang, this._paramState.from, this._paramState.to);
    }
  }

  private transformDate(date: string | Date): any {
    const d = new Date(date);
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  }

}

