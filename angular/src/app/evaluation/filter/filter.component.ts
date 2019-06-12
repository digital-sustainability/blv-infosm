
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Report } from '../../shared/models/report.model';
import { NgbDate } from '../../shared/models/ngb-date.model';
import { LanguageService } from 'src/app/shared/language.service';
import { Subscription } from 'rxjs';
import { MatPaginator, MatTableDataSource, MatSort } from '@angular/material';
import { ActivatedRoute, Router } from '@angular/router';
import { SparqlDataService } from 'src/app/shared/sparql-data.service';
import { DistributeDataService } from 'src/app/shared/distribute-data.service';
import { TranslateService } from '@ngx-translate/core';
import { remove, uniq, map } from 'lodash';
import { NgbDatepickerConfig, NgbDateParserFormatter } from '@ng-bootstrap/ng-bootstrap';
import {  NgbDateCHFormatter } from '../../shared/formatters/ngb-ch-date-formatter';
import { Translations } from '../../shared/models/translations.model';
import * as moment from 'moment';
declare let $: any;

@Component({
  selector: 'app-filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.css'],
  providers: [{provide: NgbDateParserFormatter, useClass: NgbDateCHFormatter}]
})

export class FilterComponent implements OnInit, OnDestroy {

  @ViewChild('fromPicker') datepickerFrom;
  @ViewChild('toPicker') datepickerTo;

  from: NgbDate;
  to: NgbDate;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  data: Report[];
  private _translationSub: Subscription;
  private _paramSub: Subscription;
  private _langSub: Subscription;
  private _dataSub: Subscription;
  private _filter = {
    lang: '',
    from: '',
    to: ''
  };

  trans: Translations;

  // arrays for filter information
  cantons: String[];
  epidemics: String[];
  epidemics_group: String[];
  communities: String[];
  animal_species: String[];
  animal_group: String[];

  displayedColumns: string[] = ['diagnosis_date', 'canton', 'munic', 'epidemic', 'epidemic_group', 'animal_species'];
  dataSource: any;
  beautifiedData: any[] = [];
  filteredData: any[] = [];
  filterConfig = {
    canton: [],
    munic: [],
    epidemic_group: [],
    epidemic: [],
    animal_group: [],
    animal_species: []
  };

  constructor(
    private _sparqlDataService: SparqlDataService,
    private _langauageService: LanguageService,
    private _distributeDataService: DistributeDataService,
    private _route: ActivatedRoute,
    private _router: Router,
    public translateService: TranslateService,
    public ngbDatepickerConfig: NgbDatepickerConfig
  ) { }

  ngOnInit() {
    this._paramSub = this._route.queryParams.subscribe(
      params => {
        this._filter.lang = params['lang'];
        this._filter.from = params['from'];
        this._filter.to = params['to'];
        console.log(this._filter.lang)

        // Sets parmas if none detected or one is misssing
        if (!params['lang'] || !params['from'] || !params['to']) {
          const lang = this.translateService.currentLang;
          console.log(lang)
          const from = moment().subtract(1, 'y').format('YYYY-MM-DD');
          const to = moment().format('YYYY-MM-DD');
          this.updateRouteParams({
            lang: lang,
            from: from,
            to: to
          });
          this.getList(lang, from, to);
        } else {
          // Load data according to URL-input by user
          this.getList(this._filter.lang, this._filter.from, this._filter.to);
          if (this._filter.lang !== this.translateService.currentLang) {
            this._langauageService.changeLang(this._filter.lang);
          }
        }
      }
    );

    // If the languare changes through click, update param
    this._langSub = this._langauageService.currentLang.subscribe(
      lang => {
        if (this._filter.lang !== lang) {
          // TODO: reset filter if language changes
          console.log('ParamState: ' + this._filter.lang + ' ≠ languageService: ' + lang);
          this.updateRouteParams({ lang: lang });
        }
      }, err => {
        // TODO: Imporve error handling
        console.log(err);
      }
    );

    const today = new Date();
    this.ngbDatepickerConfig.minDate = { year: 1991, month: 1, day: 15 };
    this.ngbDatepickerConfig.maxDate = {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate() };
    this.ngbDatepickerConfig.outsideDays = 'hidden';

    this.getTranslationsForErrorMessages();
  }

  onChangeTab(route: string): void {
    this._router.navigate(['evaluation' + route], { queryParamsHandling: 'merge' });
  }

  ngOnDestroy() {
    this._langSub.unsubscribe();
    this._dataSub.unsubscribe();
    this._paramSub.unsubscribe();
  }

  // updates every time when the user adds an entry in the filter
  onAdd($event, filterType: string) {
    let selectedItem = [];
    selectedItem = $event.split();
    if (this.filterConfig.hasOwnProperty(`${filterType}`)) {
      this.filterConfig[`${filterType}`].push(selectedItem.toString());
    }
    this.getList(this._filter.lang, this._filter.from, this._filter.to);
  }

  // updates every time when the user removes an entry in the filter
  onRemove($event, filterType: string) {
    if (this.filterConfig.hasOwnProperty(`${filterType}`)) {
      this.filterConfig[`${filterType}`] = remove(this.filterConfig[`${filterType}`], (item: string) => {
        return item !== $event.value;
      });
    }
    this.getList(this._filter.lang, this._filter.from, this._filter.to);
  }


  onClear($event: {}, filterType: string) {
    if (this.filterConfig.hasOwnProperty(`${filterType}`)) {
      this.filterConfig[filterType] = [];
    }
    this.getList(this._filter.lang, this._filter.from, this._filter.to);
  }

  // changes the date based on radio buttons
  onChangeDate(option: string) {
    // TODO: One year too much because we don't have all the data
    this._filter.to = moment().subtract(1, 'y').format('YYYY-MM-DD');
    switch (option) {
      case ('week'):
        this._filter.from = moment().subtract(7, 'd').format('YYYY-MM-DD'); break;
      case ('month'):
        this._filter.from = moment().subtract(1, 'm').format('YYYY-MM-DD'); break;
      case ('year'): // TODO: One year too much because we don't have all the data
        this._filter.from = moment().subtract(2, 'y').format('YYYY-MM-DD'); break; 
      case ('threeYears'):
        this._filter.from = moment().subtract(3, 'y').format('YYYY-MM-DD'); break;
      case ('whole'):
        this._filter.from = moment('1991-01-15').format('YYYY-MM-DD'); break;
    }
    // Subscription to params will update the data. No need to call getList()
    this.updateRouteParams({
      from: this._filter.from,
      to: this._filter.to
    });
  }

  onGetFromToDates() {
    // TODO: Change implementation JQuery -> Angular
    const fromdate = this.retransformDate(this.datepickerFrom._inputValue);
    const todate = this.retransformDate(this.datepickerTo._inputValue);
    console.log(fromdate, todate)
    const dateOfFirstEntry = moment('1991-01-15').format('YYYY-MM-DD');
    const today = moment().format('YYYY-MM-DD');
    this.removeErrors();
    this.getTranslationsForErrorMessages();
    if (moment(fromdate).isValid() && moment(todate).isValid() && fromdate.length === 10 && todate.length === 10) {
      if (fromdate > todate) {
        $('.notValid').after(
          `<p class='err' style='color:red' id='datecompareerror'>${this.trans['EVAL.DATE_WRONG_ORDER']}</p>`
          );
        return;
      }
      if ((moment(todate).diff(fromdate, 'days')) < 7) {
        $('.notValid').after(
          `<p class='err' style='color:red' id='dateuniterror'>${this.trans['EVAL.DATE_TOO_SMALL']}</p>`
          );
        return;
      }
      if((moment(fromdate).diff(dateOfFirstEntry)) < 0) {
        $('.notValid').after(
          `<p class='err' style='color:red' id='datefromerror'>${this.trans['EVAL.DATE_FROM_WRONG_RANGE']}</p>`
          );
        return;
      }
      if((moment(todate).diff(today)) > 0) {
        $('.notValid').after(
          `<p class='err' style='color:red' id='datetoerror'>${this.trans['EVAL.DATE_TO_WRONG_RANGE']}</p>`
          );
        return;
      }
      this._filter.from = fromdate;
      this._filter.to = todate;
      this.updateRouteParams({
        from: this._filter.from,
        to: this._filter.to
      });
      // uncheck all radio buttons since either you search for period of for specific dates
      $('.radio').prop('checked', false);
    } else {
      if ( !(moment(fromdate).isValid()) || !(moment(todate).isValid()) ) {
        $('.notValid').after(
          `<p class='err' style='color:red' id='dateformaterror'>${this.trans['EVAL.DATE_WRONG_FORMAT']}</p>`
          );
      }
    }
  }

  getTranslationsForErrorMessages(): void {
    this._translationSub = this.translateService.get([
      'EVAL.DATE_WRONG_ORDER',
      'EVAL.DATE_WRONG_FORMAT',
      'EVAL.DATE_TOO_SMALL',
      'EVAL.DATE_FROM_WRONG_RANGE',
      'EVAL.DATE_TO_WRONG_RANGE'
    ]).subscribe(
      texts => {
        this.trans = texts;
      }
    );
  }

  retransformDate(date: string | Date): string {
    return date.toString().split('.').reverse().join("-");
  }

  removeErrors() {
    $('#dateformaterror').remove();
    $('#datecompareerror').remove();
    $('#dateuniterror').remove();
    $('#datefromerror').remove();
    $('#datetoerror').remove();
  }

  private getList(lang: string, from: string | Date, to: string | Date): void {
    this._dataSub = this._sparqlDataService.getReports(lang, from, to).subscribe(
      data => {
        this.beautifiedData = [];
        this.transformData(data, false);

        this.filteredData = this.filterDataObjectBasedOnEventData(this.beautifiedData, this.filterConfig);
        this._distributeDataService.updateData(this.filteredData, from, to);

        this.extractFilterParts(data, this.filteredData);

        this.dataSource = new MatTableDataSource<any>(this.filteredData);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        // Set `from` and `to` for datepicker to match the current date selection
        this.from = this.transformDate(from);
        this.to = this.transformDate(to);
        // console.log('RAW', data);
        // console.log('BEAUTFIED', this.beautifiedData);
        console.log('FILTERED', this.filteredData);
      }, err => {
        console.log(err);
        // TODO: Imporve error handling
      });
  }

  // transforms the data object properly to use it for the table,
  // and beatifies the data that we will filter
  // TODO: Replace REGEX with real value from query
  private transformData(data: Object, originalData = false) {
    for (const element in data) {
      if (data.hasOwnProperty(element)) {
        this.beautifiedData.push({
          diagnosis_date: data[element].diagnose_datum.value,
          canton: data[element].kanton.value,
          canton_id: Number(/\d+/.exec(data[element].canton_id.value)[0]),
          munic: data[element].gemeinde.value,
          munic_id: Number(/\d+/.exec(data[element].munic_id.value)[0]),
          epidemic_group: data[element].seuchen_gruppe.value,
          epidemic: data[element].seuche.value,
          animal_group: data[element].tier_gruppe.value,
          animal_species: data[element].tierart.value
        });
      }
    }
  }

  // Update the route without having to reset all other route properties
  // All others stay untouched
  private updateRouteParams(changes: { [s: string]: string; }): void {
    for (const key in changes) {
      // Filter the inherited properties of changes, check for match in _paramState
      if (changes.hasOwnProperty(key) && this._filter.hasOwnProperty(key)) {
        this._filter[key] = changes[key];
      }
    }
    this._router.navigate(
      [], {
        queryParams: this._filter,
        // queryParamsHandling: 'merge', // remove to replace all query params by provided
        relativeTo: this._route // stay on current route
      });
  }

  // extracts all the unique strings for every filter
  private extractFilterParts(data: Report[], filteredData) {
    this.cantons = uniq(map(data, 'kanton.value')).sort();
    // this.communities = uniq(map(filteredData, 'munic')).sort();
    this.communities = [];
    this.communities = uniq(this.extractSecondHierarchy(this.filterConfig.canton, 'canton', 'munic')).sort();
    this.epidemics_group = uniq(map(data, 'seuchen_gruppe.value')).sort();
    // this.epidemics = uniq(map(filteredData, 'epidemic')).sort();
    this.epidemics = [];
    this.epidemics = uniq(this.extractSecondHierarchy(this.filterConfig.epidemic_group, 'epidemic_group', 'epidemic')).sort();
    this.animal_group = uniq(map(data, 'tier_gruppe.value')).sort();
    // this.animal_species = uniq(map(filteredData, 'animal_species')).sort();
    this.animal_species = [];
    this.animal_species = uniq(this.extractSecondHierarchy(this.filterConfig.animal_group, 'animal_group', 'animal_species')).sort();
  }

  private extractSecondHierarchy(keys: string[], firstOrder: string, secondOrder: string) {
    if (keys.length !== 0) {
      let items = [];
      items = this.beautifiedData
      .filter((el) => keys.includes(el[firstOrder]))
      .map(obj => obj[secondOrder]);
      return(items);
    } else {
      let items = [];
      items = this.beautifiedData.map(el => {
        return el[secondOrder];
      });
      return(items);
    }
  }

  // filters the data object based on the selected entries from
  // the user in the currentFilter array
  // TODO: check function when multiple filters selected, at the moment
  // every entry of the currentFilter is filtered separately
  private filterDataObjectBasedOnEventData(data: Report[], filterObject) {
    const filteredData = [];
    for (let i = 0; i < data.length; i++) {
      let insideFilter = false;
      if ( this.checkFilter('canton', data[i]['canton'], filterObject) ) {
        if ( this.checkFilter('munic', data[i]['munic'], filterObject) ) {
          if ( this.checkFilter('epidemic_group', data[i]['epidemic_group'], filterObject) ) {
            if ( this.checkFilter('epidemic', data[i]['epidemic'], filterObject) ) {
              if ( this.checkFilter('animal_group', data[i]['animal_group'], filterObject) ) {
                if ( this.checkFilter('animal_species', data[i]['animal_species'], filterObject) ) {
                  insideFilter = true;
                }
              }
            }
          }
        }
      } else {
        insideFilter = false;
      }

      if (insideFilter) {
        filteredData.push({
          diagnosis_date: data[i]['diagnosis_date'],
          canton: data[i]['canton'],
          munic: data[i]['munic'],
          epidemic_group: data[i]['epidemic_group'],
          epidemic: data[i]['epidemic'],
          animal_group: data[i]['animal_group'],
          animal_species: data[i]['animal_species'],
          // TODO: @Jonas does that make sense here?
          // Add IDs to data for map component
          canton_id: data[i]['canton_id'],
          munic_id: data[i]['munic_id'],
        });
      }
    }
    return filteredData;
  }

  private checkFilter(type: string, compare: string, filterObject) {
    return (filterObject[type].length !== 0 && filterObject[type].includes(compare)) || filterObject[type].length === 0;
  }

  private transformDate(date: string | Date): NgbDate {
    const d = new Date(date);
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  }
}


// toggleCheckbox($event: boolean, filterType: string) {
  //   const idSelector = function () { return this.id; };
  //   if (!$event) {
  //     switch (filterType) {
  //       case 'canton':
  //         const selectedCantons = $(':checkbox:checked[name=canton]').attr('checked', true).map(idSelector).get();
  //         this.createFilterConfigDropdown(filterType, selectedCantons);
  //         break;
  //       case 'epidemic_group':
  //         const selectedEpidemics = $(':checkbox:checked[name=epidemic]').attr('checked', true).map(idSelector).get();
  //         this.createFilterConfigDropdown(filterType, selectedEpidemics);
  //         break;
  //       case 'animal_group':
  //         const selectedAnimals = $(':checkbox:checked[name=animal]').attr('checked', true).map(idSelector).get();
  //         this.createFilterConfigDropdown(filterType, selectedAnimals);
  //         break;
  //     }
  //     this.getList(this._filter.lang, this._filter.from, this._filter.to);
  //   }
  // }

  // createFilterConfigDropdown(filterType: string, arrSelected: []) {
  //   if (this.filterConfig.hasOwnProperty(`${filterType}`)) {
  //     this.filterConfig[`${filterType}`] = [];
  //     arrSelected.forEach(entry => {
  //       this.filterConfig[`${filterType}`].push(entry);
  //     });
  //   }
  // }
