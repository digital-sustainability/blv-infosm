
import { Component, OnInit, OnDestroy, ViewChild, AfterViewChecked } from '@angular/core';
import { Report } from '../../shared/models/report.model';
import { NgbDate } from '../../shared/models/ngb-date.model';
import { InputField} from '../../shared/models/inputfield.model';
import { LanguageService } from 'src/app/shared/language.service';
import { Subscription } from 'rxjs';
import { MatPaginator, MatTableDataSource, MatSort, MatSortable } from '@angular/material';
import { ActivatedRoute, Router } from '@angular/router';
import { SparqlDataService } from 'src/app/shared/sparql-data.service';
import { DistributeDataService } from 'src/app/shared/distribute-data.service';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../shared/notification.service';
import { remove, uniq, map } from 'lodash';
import { NgbDatepickerConfig, NgbDateParserFormatter, NgbDatepicker } from '@ng-bootstrap/ng-bootstrap';
import { NgbDateCHFormatter } from '../../shared/formatters/ngb-ch-date-formatter';
import { Translations } from '../../shared/models/translations.model';
import { FilterConfig } from '../../shared/models/filterConfig.model';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import * as moment from 'moment';
import dayjs from 'dayjs';
declare let $: any;

@Component({
  selector: 'app-filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.css'],
  providers: [{provide: NgbDateParserFormatter, useClass: NgbDateCHFormatter}]
})

export class FilterComponent implements OnInit, OnDestroy {

  @ViewChild('fromPicker') datepickerFrom: NgbDatepicker;
  @ViewChild('toPicker') datepickerTo: NgbDatepicker;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  from: NgbDate;
  to: NgbDate;

  private _translationSub: Subscription;
  private _paramSub: Subscription;
  private _langSub: Subscription;
  private _dataSub: Subscription;
  
  private _cantonsSub: Subscription;
  private _municSub: Subscription;
  private _epidemicsGroupSub: Subscription;
  private _animalsGroupSub: Subscription;
  private _animalsSub: Subscription;
  private _epidemicsSub: Subscription;

  private _filter = {
    lang: '',
    from: '',
    to: ''
  };

  trans: Translations;

  formCant: FormGroup;
  formMunic: FormGroup;
  formEpidG: FormGroup;
  formEpid: FormGroup;
  formAniG: FormGroup;
  formAni: FormGroup;

  // arrays for initial finning of input fields
  // NOTE: also values that never occured are included (e.g. all the communities of Switzerland)
  allCantons: string[];
  allCommunities: string[];
  allEpidemicsGroups: string[];
  allEpidemics: string[];
  allAnimalGroups: string[];
  allAnimals: string[];
  
  // arrays for possible selection, that is, there is an object in the dataset that matches an entry
  cantons: string[];
  communities: string[];
  epidemicsGroups: string[];
  epidemics: string[];
  animalGroups: string[];
  animals: string[];

  // final selectable and disabled array of items that are visible in the input field
  inputCantons: InputField[];
  inputCommunities: InputField[];
  inputEpidemicsGroup: InputField[];
  inputEpidemics: InputField[];
  inputAnimalGroups: InputField[];
  inputAnimals: InputField[];

  // booleans to control the logic which part of the filter is displayed first
  cantonsComminities: boolean = false;
  epidemicsAndGroups: boolean = false;
  animalsAndGroups: boolean = false;

  data: Report[];
  displayedColumns: string[] = ['diagnosis_date', 'canton', 'munic', 'epidemic', 'epidemic_group', 'animal_species'];
  dataSource: MatTableDataSource<[]>;
  // TODO: TYPES!!!
  beautifiedData: any[] = [];
  filteredData: any[] = [];
  filterConfig: FilterConfig = {
    canton: [],
    munic: [],
    epidemic_group: [],
    epidemic: [],
    animal_group: [],
    animal_species: []
  };
  sortItem: string;
  sortDirection: string;
  sortAsc: string;
  sortDesc: string;
  sorted: boolean;

  constructor(
    private _sparqlDataService: SparqlDataService,
    private _langauageService: LanguageService,
    private _distributeDataService: DistributeDataService,
    private _route: ActivatedRoute,
    private _router: Router,
    private _notification: NotificationService,
    public translateService: TranslateService,
    public ngbDatepickerConfig: NgbDatepickerConfig,
    private fb: FormBuilder
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
          const to = dayjs().format('YYYY-MM-DD');
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
        this._notification.errorMessage(err.statusText + '<br>' + err.message , err.name);
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

    this.getTranslations();

    // set the initial state of the sorted table
    this.sortDirection = 'asc';
    this.sorted = true;
  }

  ngAfterViewInit(): void {
    this.formCant = this.fb.group({canton: '',});
    this.formMunic = this.fb.group({munic:'',});
    this.formEpidG = this.fb.group({epidemicG:""});
    this.formEpid = this.fb.group({epidemic:''});
    this.formAniG = this.fb.group({animalG:''});
    this.formAni = this.fb.group({animal:''});
  }

  onChangeTab(route: string): void {
    this._router.navigate(['evaluation' + route], { queryParamsHandling: 'merge' });
  }

  ngOnDestroy(): void {
    this._langSub.unsubscribe();
    this._dataSub.unsubscribe();
    this._paramSub.unsubscribe();
  }

  private getList(lang: string, from: string | Date, to: string | Date): void {
    this._dataSub = this._sparqlDataService.getReports(lang, from, to).subscribe(
      data => {
        this.beautifiedData = [];
        this.transformData(data);
     
        this.filteredData = this.filterDataObjectBasedOnEventData(this.beautifiedData, this.filterConfig);
        this._distributeDataService.updateData(this.filteredData, from, to);
        this.extractFilterParts(data, this.filteredData);
        this.getAllPossibleValues(lang);
        this.constructTable(this.filteredData);
        // Set `from` and `to` for datepicker to match the current date selection
        this.from = this.transformDate(from);
        this.to = this.transformDate(to);
        // console.log('RAW', data);
        // console.log('BEAUTFIED', this.beautifiedData);
        console.log('FILTERED', this.filteredData);
        this.getTranslations();
      }, err => {
        console.log(err);
        this._notification.errorMessage(err.statusText + '<br>' + err.message , err.name);
        // TODO: Imporve error handling
      });
  }

  // updates every time when the user adds an entry in the filter
  onAdd($event, filterType: string): void {
    let selectedItem = [];
    selectedItem = $event.split();
    if (this.filterConfig.hasOwnProperty(`${filterType}`)) {
      this.filterConfig[`${filterType}`].push(selectedItem.toString());
    }
    this.getList(this._filter.lang, this._filter.from, this._filter.to);
  }

  // updates every time when the user removes an entry in the filter
  onRemove($event, filterType: string): void {
    if (this.filterConfig.hasOwnProperty(`${filterType}`)) {
      this.filterConfig[`${filterType}`] = remove(this.filterConfig[`${filterType}`], (item: string) => {
        return item !== $event.value;
      });
    }
    this.getList(this._filter.lang, this._filter.from, this._filter.to);
  }


  onClear($event: {}, filterType: string): void {
    if (this.filterConfig.hasOwnProperty(`${filterType}`)) {
      this.filterConfig[filterType] = [];
    }
    this.getList(this._filter.lang, this._filter.from, this._filter.to);
  }

  onSelectAll(input: InputField[], formControlName: string, form: FormGroup): void {
    const selected = input.filter(item => !(item['disabled']));
    form.get(formControlName).patchValue(selected);
  }

  onClearAll(formControlName: string, form: FormGroup): void {
    form.get(formControlName).patchValue([]);
  }

  // transforms the data object properly to use it for the table,
  // and beatifies the data that we will filter
  // TODO: Replace REGEX with real value from query
  private transformData(data: any[], originalData = false) {
    for (const el in data) {
      if (data.hasOwnProperty(el)) {
        this.beautifiedData.push({
          diagnosis_date: data[el].diagnose_datum.value,
          canton: data[el].kanton.value,
          canton_id: Number(/\d+/.exec(data[el].canton_id.value)[0]),
          munic: data[el].gemeinde.value,
          munic_id: Number(/\d+/.exec(data[el].munic_id.value)[0]),
          epidemic_group: data[el].seuchen_gruppe.value,
          epidemic: data[el].seuche.value,
          animal_group: data[el].tier_gruppe.value,
          animal_species: data[el].tierart.value
        });
      }
    }
  }

  // extracts all the unique strings for every filter
  private extractFilterParts(data: Report[], filteredData) {
    this.cantons = uniq(map(data, 'kanton.value')).sort();
    // this.communities = uniq(map(filteredData, 'munic')).sort();
    this.communities = [];
    this.communities = uniq(this.extractSecondHierarchy(this.filterConfig.canton, 'canton', 'munic')).sort();
    this.epidemicsGroups = uniq(map(data, 'seuchen_gruppe.value')).sort();
    // this.epidemics = uniq(map(filteredData, 'epidemic')).sort();
    this.epidemics = [];
    this.epidemics = uniq(this.extractSecondHierarchy(this.filterConfig.epidemic_group, 'epidemic_group', 'epidemic')).sort();
    this.animalGroups = uniq(map(data, 'tier_gruppe.value')).sort();
    // this.animal_species = uniq(map(filteredData, 'animal_species')).sort();
    this.animals = [];
    this.animals = uniq(this.extractSecondHierarchy(this.filterConfig.animal_group, 'animal_group', 'animal_species')).sort();
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
  // TODO: check function when multiple filters selected, at the dayjs
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

  private checkFilter(type: string, compare: string, filterObject): boolean {
    return (filterObject[type].length !== 0 && filterObject[type].includes(compare)) || filterObject[type].length === 0;
  }

  // Constructs the list of items for the input field.
  // @param possibleItems: items that can be selected. either they are in the selected time interval
  //        or they contain are part of a match when the user already filtered
  // @param uniqueItems: unnique items that could have an entry in the database in the future but don't have yet
  // Returns an object of type InputField and stated which of them are selectable
  private constructItemList(possibleItems: string[], uniqueItems: string[]): InputField[] {
    let disabledList = [];
    let selectableList = [];
    uniqueItems.forEach((entry: string, index: number) => {
      if (possibleItems.includes(entry)) {
        selectableList.push({
          label: entry,
        });
      } else {
        disabledList.push({
          label: entry,
          disabled: 'true'
        });
      };
    });
    disabledList = this.sortItems(disabledList, 'label');
    selectableList = this.sortItems(selectableList, 'label');
    return selectableList.concat(disabledList);
  }

  // Sorts an object of type InputField based on a key that hay a value of type string string
  private sortItems(inputField: InputField[], key: string): InputField[] {
    return inputField.sort( (a: InputField, b: InputField) => {
      let x = a[key].trim().toLowerCase();
      let y = b[key].trim().toLowerCase();
      return  x < y ? -1 : x > y ? 1 : 0;
    });
  }

  private transformDate(date: string | Date): NgbDate {
    const d = new Date(date);
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
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

  private constructTable(filteredData: any[]): void {
    this.dataSource = new MatTableDataSource<any>(filteredData);
    this.dataSource.paginator = this.paginator;
    this.sort.sort(<MatSortable>{
      id: 'diagnosis_date', 
      start: 'desc'
    });
    this.dataSource.sort = this.sort;
  }


  // changes the date based on radio buttons
  onChangeDate(option: string): void {
    // TODO: One year too much because we don't have all the data
    this._filter.to = dayjs().subtract(1, 'y').format('YYYY-MM-DD');
    switch (option) {
      case ('week'):
        this._filter.from = dayjs().subtract(7, 'd').format('YYYY-MM-DD'); break;
      case ('month'):
        this._filter.from = dayjs().subtract(1, 'm').format('YYYY-MM-DD'); break;
      case ('year'): // TODO: One year too much because we don't have all the data
        this._filter.from = dayjs().subtract(2, 'y').format('YYYY-MM-DD'); break; 
      case ('threeYears'):
        this._filter.from = dayjs().subtract(3, 'y').format('YYYY-MM-DD'); break;
      case ('whole'):
        this._filter.from = dayjs('1991-01-15').format('YYYY-MM-DD'); break;
    }
    // Subscription to params will update the data. No need to call getList()
    this.updateRouteParams({
      from: this._filter.from,
      to: this._filter.to
    });
  }

 getTranslations(): void {
    this._translationSub = this.translateService.get([
      'EVAL.DATE_WRONG_ORDER',
      'EVAL.DATE_WRONG_FORMAT',
      'EVAL.DATE_TOO_SMALL',
      'EVAL.DATE_FROM_WRONG_RANGE',
      'EVAL.DATE_TO_WRONG_RANGE',
      'EVAL.ORDER_DESCENDING',
      'EVAL.ORDER_ASCENDING',
      'EVAL.ORDER_BY',
      'EVAL.VISU_DATA',
      'EVAL.CANTON',
      'EVAL.MUNICIPALITY',
      'EVAL.PEST',
      'EVAL.PEST_GROUP',
      'EVAL.ANIMAL_SPECIES',
      'EVAL.DIAGNOSIS_DATE'
    ]).subscribe(
      async (texts) => {
        this.trans = await texts;
        this.sortItem = this.trans['EVAL.DIAGNOSIS_DATE'];
        this.sortAsc = this.trans['EVAL.ORDER_ASCENDING'];
        this.sortDesc = this.trans['EVAL.ORDER_DESCENDING']
      }
    );
  }

  retransformDate(date: string | Date): string {
    return date.toString().split('.').reverse().join("-");
  }

  getSortItemAndOrder($event: Object): void {
    this.getTranslations();
    const column = $event['active'];
    const direction = $event['direction'];
    if (direction === 'asc') {
      this.sortDirection = this.sortAsc; 
      this.sorted = true;
    } else if (direction === 'desc') {
      this.sortDirection = this.sortDesc; 
      this.sorted = true;
    } else {
      this.sorted= false;
      return;
    }
    switch (column) {
      case 'canton': this.sortItem = this.trans['EVAL.CANTON']; break;
      case 'munic': this.sortItem = this.trans['EVAL.MUNICIPALITY']; break;
      case 'epidemic': this.sortItem =this.trans['EVAL.PEST']; break;
      case 'epidemic_group': this.sortItem = this.trans['EVAL.PEST_GROUP']; break;
      case 'animal_species': this.sortItem = this.trans['EVAL.ANIMAL_SPECIES']; break;
      default : this.sortItem = this.trans['EVAL.DIAGNOSIS_DATE'];
    }
  }

  // changes the date based on the datepickers
  onGetFromToDates(from: NgbDate, to: NgbDate): void {
    const fromdate =  dayjs(from.year + '-' + from.month + '-' + from.day).format('YYYY-MM-DD');
    const todate = dayjs(to.year + '-' + to.month + '-' + to.day).format('YYYY-MM-DD');
    const dateOfFirstEntry = dayjs('1991-01-15').format('YYYY-MM-DD');
    const today = dayjs().format('YYYY-MM-DD');
    this.removeErrors();
    this.getTranslations();
    if (dayjs(fromdate).isValid() && dayjs(todate).isValid() && fromdate.length === 10 && todate.length === 10) {
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
      if ((moment(fromdate).diff(dateOfFirstEntry)) < 0) {
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
      if ( !(dayjs(fromdate).isValid()) || !(dayjs(todate).isValid()) ) {
        $('.notValid').after(
          `<p class='err' style='color:red' id='dateformaterror'>${this.trans['EVAL.DATE_WRONG_FORMAT']}</p>`
          );
      }
    }
  }

  removeErrors(): void {
    $('#dateformaterror').remove();
    $('#datecompareerror').remove();
    $('#dateuniterror').remove();
    $('#datefromerror').remove();
    $('#datetoerror').remove();
  }

  private getAllPossibleValues(lang: string): void {
    this.getUniqueCantons();
    this.getUniqueMunicipalities();
    this.getUniqueEpidemicGroups(lang);
    this.getUniqueAnimalGroups(lang);
    this.getUniqueAnimals(lang);
    this.getUniqueEpidemics(lang);
  }

  private getUniqueCantons(): void {
    this._cantonsSub = this._sparqlDataService.getUniqueCantons().subscribe(
      uniqueCantons => {
        this.allCantons = this.beautifyItems(uniqueCantons, 'kanton');
        this.inputCantons = this.constructItemList(this.cantons, this.allCantons);
      }, err => {
        this._notification.errorMessage(err.statusText + '<br>' + err.message , err.name);
     }
    );
  }

  private getUniqueMunicipalities(): void {
    this._municSub = this._sparqlDataService.getUniqueMunicipalities().subscribe(
      uniqueMunic => {
        this.allCommunities = this.beautifyItems(uniqueMunic, 'gemeinde');
        this.inputCommunities = this.constructItemList(this.communities, this.allCommunities);
      }, err => {
        this._notification.errorMessage(err.statusText + '<br>' + err.message, err.name)
      }
    );
  }

  private getUniqueEpidemicGroups(lang: string): void {
    this._epidemicsGroupSub = this._sparqlDataService.getUniqueEpidemicGroups(lang).subscribe(
      uniqueEpidGroup => {
        this.allEpidemicsGroups = this.beautifyItems(uniqueEpidGroup, 'seuchen_gruppe');
        this.inputEpidemicsGroup = this.constructItemList(this.epidemicsGroups, this.allEpidemicsGroups);
      }, err => {
        this._notification.errorMessage(err.statusText + '<br>' + err.message, err.name)
      }
    );
  }

  private getUniqueEpidemics(lang: string): void {
    this._epidemicsSub = this._sparqlDataService.getUniqueEpidemics(lang).subscribe(
      uniqueEpid => {
        this.allEpidemics = this.beautifyItems(uniqueEpid, 'tier_seuche');
        this.inputEpidemics = this.constructItemList(this.epidemics, this.allEpidemics);
      }, err => {
        this._notification.errorMessage(err.statusText + '<br>' + err.message, err.name)
      }
    );
  }

  private getUniqueAnimalGroups(lang: string): void {
    this._animalsGroupSub = this._sparqlDataService.getUniqueAnimalGroups(lang).subscribe(
      uniqueAnimalGroups => {
        this.allAnimalGroups =  this.beautifyItems(uniqueAnimalGroups, 'tier_gruppe');
        this.inputAnimalGroups = this.constructItemList(this.animalGroups, this.allAnimalGroups)
      }, err => {
        this._notification.errorMessage(err.statusText + '<br>' + err.message, err.name)
      }
    );
  }

  private getUniqueAnimals(lang: string): void {
    this._animalsSub = this._sparqlDataService.getUniqueAnimals(lang).subscribe(
      uniqueAnimals => {
        this.allAnimals = this.beautifyItems(uniqueAnimals, 'tier_art');
        this.inputAnimals = this.constructItemList(this.animals, this.allAnimals);
      }, err => {
        this._notification.errorMessage(err.statusText + '<br>' + err.message, err.name)
      }
    );
  }
  
  private beautifyItems(item: any[], type: string): string[] {
    let niceItems: string[] = [];
    item.forEach(entry => {
      niceItems.push(entry[type]['value']);
    });
    return niceItems;
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
