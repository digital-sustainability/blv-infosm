
import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { Report } from '../../models/report.model';
import { LanguageService } from 'src/app/shared/language.service';
import { Subscription } from 'rxjs';
import { MatPaginator, MatTableDataSource, MatSort } from '@angular/material';
import { ActivatedRoute, Router } from '@angular/router';
import { SparqlDataService } from 'src/app/shared/sparql-data.service';
import { DistributeDataService } from 'src/app/shared/distribute-data.service';
import { TranslateService } from '@ngx-translate/core';
import * as moment from 'moment';
import * as _ from 'lodash';
declare let $: any;

@Component({
  selector: 'app-filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.css']
})

export class FilterComponent implements OnInit, AfterViewInit, OnDestroy {
  
  @ViewChild('d') datepicker;
  @ViewChild('c') datepicker2;

  from;
  to;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  data: Report[];
  private _paramSub: Subscription;
  private _langSub: Subscription;
  private _dataSub: Subscription;
  private _filter = {
    lang: '',
    from: '',
    to: ''
  };

  // arrays for filter information
  cantons: String[];
  epidemics: String[];
  epidemics_group: String[];
  communities: String[];
  animal_species: String[];

  element_data: any[] = [];
  displayedColumns: string[] = ['diagnose_datum', 'kanton', 'gemeinde', 'seuche', 'seuchen_gruppe', 'tierart'];
  dataSource: any;
  currentFilter: String[] = [];
  filterConfig = {
    canton: [],
    community:[],
    epidemic: [],
    epidemic_group: [],
    animal_species: []
  }

  
  constructor(
    private _sparqlDataService: SparqlDataService,
    private _langauageService: LanguageService,
    private _distributeDataService: DistributeDataService,
    private _route: ActivatedRoute,
    private _router: Router,
    public translateService: TranslateService
  ) { }


  ngOnInit() {
    this._paramSub = this._route.queryParams.subscribe(
      params => {
        this._filter.lang = params['lang'];
        this._filter.from = params['from'];
        this._filter.to = params['to'];

        // Sets parmas if none detected or one is misssing
        if (!params['lang'] || !params['from'] || !params['to']) {
          const lang = this.translateService.currentLang;
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
  }

  ngAfterViewInit() {
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
    console.log('selectedItem: ');
    console.log(selectedItem);

    // TODO: decide if we use filterConfig Object or currentFilter Array
    // to store the selected filters from the user
    if (this.filterConfig.hasOwnProperty(`${filterType}`)) {
      this.filterConfig[`${filterType}`].push(selectedItem.toString());
      console.log(this.filterConfig)
    }
    // tmpArr.forEach(el => {
      if (_.indexOf(this.currentFilter, selectedItem[0]) === -1) {
        this.currentFilter.push(selectedItem[0]);
      }
    // });

    console.log('Current Filter: ');
    console.log(this.currentFilter);
    this.getList(this._filter.lang, this._filter.from, this._filter.to);
  }

  // updates every time when the user removes an entry in the filter
  onRemove($event, filterType: string) {
    const index = this.currentFilter.indexOf($event.value);
    if (index > -1) {
      this.currentFilter.splice(index, 1);
    }

    if (this.filterConfig.hasOwnProperty(`${filterType}`)) {
      this.filterConfig[`${filterType}`]  = _.remove(this.filterConfig[`${filterType}`], (item: string) => {
        return item !== $event.value;
      });
    }

    console.log('Current filter after removing selected item:');
    console.log(this.currentFilter);
    this.getList(this._filter.lang, this._filter.from, this._filter.to);
  }

  // changes the date based on radio buttons
  changeDate(option: string) {
    // TODO: One year too much because we don't have all the data
    this._filter.to = moment().subtract(1, 'y').format('YYYY-MM-DD');
    switch (option) {
      case ('week'):
        this._filter.from = moment().subtract(7, 'd').format('YYYY-MM-DD'); this.disableDateFilter(); break;
      case ('month'):
        this._filter.from = moment().subtract(1, 'm').format('YYYY-MM-DD'); this.disableDateFilter(); break;
      case ('year'):
        this._filter.from = moment().subtract(2, 'y').format('YYYY-MM-DD'); this.disableDateFilter(); break; // TODO: One year too much because we don't have all the data
      case ('threeYears'):
        this._filter.from = moment().subtract(3, 'y').format('YYYY-MM-DD'); this.disableDateFilter(); break;
      case ('whole'):
        // TODO: replace with date from the first entry
        this._filter.from = moment().subtract(30, 'y').format('YYYY-MM-DD'); this.disableDateFilter(); break;
    }
    // Subscription to params will update the data. No need to call getList()
    this.updateRouteParams({
      from: this._filter.from,
      to: this._filter.to
    });
  }

  private getList(lang: string, from: string | Date, to: string | Date): void {
    this._dataSub = this._sparqlDataService.getReports(lang, from, to).subscribe(
      data => {
        this.data = data;
        console.log(this.data)
        // filter the data if event was fired
        if (this.currentFilter.length !== 0) {
          this.data = this.filterDataObjectBasedOnEventData(data, this.currentFilter);
        }
        this._distributeDataService.updateData(this.data);
        this.extractFilterParts(this.data);

        this.getFrequencyTable(data); // TODO: Temp
        // Prepare data for table
        // remove all elements from element_data due to language change
        this.element_data = [];
        this.transformDataToMaterializeTable(this.data, false);
        this.dataSource = new MatTableDataSource<any>(this.element_data);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      }, err => {
        console.log(err);
        // TODO: Imporve error handling
      });
  }

  // transforms the data object properly to use it for the table
  private transformDataToMaterializeTable(data: Object, originalData = false) {
    for (let element in data) {
      this.element_data.push({
        diagnose_datum: data[element].diagnose_datum.value,
        kanton: data[element].kanton.value,
        gemeinde: data[element].gemeinde.value,
        seuche: data[element].seuche.value,
        seuchen_gruppe: data[element].seuchen_gruppe.value,
        tierart: data[element].tierart.value
      });
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
  private extractFilterParts(data: Report[]) {
    this.cantons = _.uniq(_.map(data, 'kanton.value')).sort();
    this.communities = _.uniq(_.map(data, 'gemeinde.value')).sort();
    this.epidemics = _.uniq(_.map(data, 'seuche.value')).sort();
    this.epidemics_group = _.uniq(_.map(data, 'seuchen_gruppe.value')).sort();
    this.animal_species = _.uniq(_.map(data, 'tierart.value')).sort();
  }

  // filters the data object based on the selected entries from
  // the user in the currentFilter array
  // TODO: check function when multiple filters selected, at the moment
  // every entry of the currentFilter is filtered separately
  private filterDataObjectBasedOnEventData(data: Report[], filterArray: String[]) {
    const filteredData = [];
    for (let i = 0; i < filterArray.length; i++) {
      for (const entry of data) {
        for (const value of Object.values(entry)) {
          if (value['value'] === filterArray[i]) {
            filteredData.push(entry);
          }
        }
      }
    }
    return filteredData;
  }

  private getFrequencyTable(reports): void {
    const animals = reports.map(r => {
      return {
        tierart: r.tierart.value,
        seuche: r.seuche.value,
      };
    });
    const animalTypes = _.uniqBy(animals.map(a => a.tierart));
    const result = [];
    animalTypes.forEach((at: string) => {
      const seuchen = [];
      animals.forEach(a => {
        if (at === a.tierart) {
          seuchen.push(a.seuche);
        }
      });
      const tmp = _.countBy(seuchen);
      tmp.tierart = at;
      result.push(tmp);
    });
    // console.table(result);
  }

  getFromToDates() {
    let fromdate = this.datepicker._inputValue
    let todate = this.datepicker2._inputValue;
    this.removeErrors();
    if (moment(fromdate).isValid() && moment(todate).isValid() && fromdate.length === 10 && todate.length === 10 ) {
      if(fromdate > todate) {
        $('button.notValid').after("<p style='color:red' id='datecompareerror'>*** error: date from > date to ***</p>"); 
        return;
      }
      if((moment(todate).diff(fromdate, 'days')) < 7) {
        $('button.notValid').after("<p style='color:red' id='dateuniterror'>*** error: the smallest time unit to search for is one week ***</p>"); 
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
      $('#dateformaterror').remove();
     } else {
      if( !($('#notValid').length) ) {
        $('button.notValid').after("<p style='color:red' id='dateformaterror'>*** not a valid date! right format: YYYY-MM-DD ***</p>");
      }
    }
  }

  disableDateFilter() {
    // (<HTMLInputElement>document.getElementById("from")).value = "";
    // (<HTMLInputElement>document.getElementById("to")).value = "";
  }

  removeErrors() {
    $('#dateformaterror').remove();
    $('#datecompareerror').remove();
    $('#dateuniterror').remove();
  }
}
