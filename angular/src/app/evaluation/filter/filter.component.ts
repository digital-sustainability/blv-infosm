
import { Component, OnInit, OnDestroy, ViewChild, AfterViewChecked } from '@angular/core';
import { Report } from '../../shared/models/report.model';
import { NgbDate } from '../../shared/models/ngb-date.model';
import { InputField } from '../../shared/models/inputfield.model';
import { LanguageService } from 'src/app/shared/language.service';
import { Subscription } from 'rxjs';
import { map as rxjsmap } from 'rxjs/operators';
import { MatPaginator, MatTableDataSource, MatSort, MatSortable } from '@angular/material';
import { ActivatedRoute, Router } from '@angular/router';
import { SparqlDataService } from 'src/app/shared/sparql-data.service';
import { DistributeDataService } from 'src/app/shared/distribute-data.service';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../shared/notification.service';
import { remove, uniq, map, reduce } from 'lodash';
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
  providers: [{ provide: NgbDateParserFormatter, useClass: NgbDateCHFormatter }]
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

  disable: boolean = false;

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
  possibleSelections = {
    cantons: [],
    communities: [],
    epidemicsGroups: [],
    epidemics: [],
    animalGroups: [],
    animals: []
  }

  // cantons: string[];
  // communities: string[];
  // epidemicsGroups: string[];
  // epidemics: string[];
  // animalGroups: string[];
  // animals: string[];

  // final selectable and disabled array of items that are visible in the input field
  inputCantons: InputField[];
  inputCommunities: InputField[];
  inputEpidemicsGroup: InputField[];
  inputEpidemics: InputField[];
  inputAnimalGroups: InputField[];
  inputAnimals: InputField[];

  // the currently selected items for every input field
  selectedCantons = [];
  selectedMunic = [];
  selectedEpidemicG = [];
  selectedEpidemic = [];
  selectedAnimalG = [];
  selectedAnimal = []

  // booleans to control the logic which part of the filter is displayed first
  showCanton: boolean = false;
  showMunic: boolean = false;
  showEdidemicG: boolean = false;
  showEdidemic: boolean = false;
  showAnimalG: boolean = false;
  showAnimal: boolean = false;

  filterEntryPoint: string;
  noFilter: boolean = true;
  stateOrder: number = 0;
  hierarchy: number = 0;
  elementsAbove = {};
  elementsBelow = {};
  showAlert: boolean = false;

  data: Report[];
  displayedColumns: string[] = ['diagnosis_date', 'canton', 'munic', 'epidemic', 'epidemic_group', 'animal_species'];
  dataSource: MatTableDataSource<[]>;
  // TODO: TYPES!!!
  beautifiedData: Report[];
  filteredData: any[] = [];
  filterConfig: FilterConfig = {
    canton: { filter: [], hierarchy: 0, position: 0 },
    munic: { filter: [], hierarchy: 0 },
    epidemic_group: { filter: [], hierarchy: 0, position: 0 },
    epidemic: { filter: [], hierarchy: 0 },
    animal_group: { filter: [], hierarchy: 0, position: 0 },
    animal_species: { filter: [], hierarchy: 0 }
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
    $('#toast').toast('show')
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
          this.getList(this._filter.lang, this._filter.from, this._filter.to);
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
        this._notification.errorMessage(err.statusText + '<br>' + err.message, err.name);
        console.log(err);
      }
    );

    const today = new Date();
    this.ngbDatepickerConfig.minDate = { year: 1991, month: 1, day: 15 };
    this.ngbDatepickerConfig.maxDate = {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate()
    };
    this.ngbDatepickerConfig.outsideDays = 'hidden';

    this.getTranslations();

    // set the initial state of the sorted table
    this.sortDirection = 'asc';
    this.sorted = true;

    this.formCant = this.fb.group({ canton: '', });
    this.formMunic = this.fb.group({ munic: '', });
    this.formEpidG = this.fb.group({ epidemicG: '' });
    this.formEpid = this.fb.group({ epidemic: '' });
    this.formAniG = this.fb.group({ animalG: '' });
    this.formAni = this.fb.group({ animal: '' });
  }

  ngAfterViewInit(): void {

  }

  onChangeTab(route: string): void {
    this._router.navigate(['evaluation' + route], { queryParamsHandling: 'merge' });
  }

  ngOnDestroy(): void {
    this._langSub.unsubscribe();
    this._dataSub.unsubscribe();
    this._paramSub.unsubscribe();
  }

  // private getList(lang: string, from: string | Date, to: string | Date): void {
  //   this._dataSub = this._sparqlDataService.getReports(lang, from, to).subscribe(
  //     data => {
        
  //       this.beautifiedData = [];
  //       //this.transformData(data);
  //       console.log(this.beautifiedData)
  //       this.getAllPossibleValues(lang);

  //       this.filteredData = this.filterDataObjectBasedOnEventData(this.beautifiedData, this.filterConfig);
  //       this._distributeDataService.updateData(this.filteredData, from, to);

  //       this.extractFilterParts(data, this.filteredData);
  //       this.noFilter = false;


  //       this.constructTable(this.filteredData);
  //       // Set `from` and `to` for datepicker to match the current date selection
  //       this.from = this.transformDate(from);
  //       this.to = this.transformDate(to);
  //       // console.log('RAW', data);
  //       // console.log('BEAUTFIED', this.beautifiedData);
  //       console.log('FILTERED', this.filteredData);
  //       this.getTranslations();
  //     }, err => {
  //       console.log(err);
  //       this._notification.errorMessage(err.statusText + '<br>' + err.message, err.name);
  //       // TODO: Imporve error handling
  //     });
  // }

  removeLowerHierarchies(reset: boolean) {
    this.showAlert = false;
    if (reset) {
      let hierarchiesToRemove = Object.keys(this.elementsBelow);
      for (const el of hierarchiesToRemove) {
        this.filterConfig[el].filter = [];
      }

    }

  }

  toggleDisableInput(formGroup: FormGroup, test: string) {
    if (formGroup.controls[`${test}`].disabled) {
      formGroup.controls[`${test}`].enable();
    } else {
      formGroup.controls[`${test}`].disable();
    }
  }

  // toggleDisableAddSecondHierarchy(toDisable: string, formGroup: FormGroup, test: string) {
  //   $(toDisable).prop('disabled', true);
  //   this.toggleDisableInput(formGroup, test);
  // }

  // updates every time when the user adds an entry in the filter,
  // always when the user adds an entry, we have to adapt the possible
  // selections in the inputfileds in an or logic based on on the
  // selections the user made in the hierarchies above
  onAdd($event, filterType: string): void {

    this.checkHierarchy(filterType);

    let selectedItem = [];
    selectedItem = $event.label;
    if (this.filterConfig.hasOwnProperty(`${filterType}`)) {
      this.filterConfig[`${filterType}`].filter.push(selectedItem.toString());
    }

    
    const actualHierarchy = this.getHierarchy(filterType);
    const entriesToAdatpInputs = this.filterHierarchiesAbove(actualHierarchy, filterType);
    //this.possibleSelections[filterType] = 
    this.adaptPossibleSelections(entriesToAdatpInputs, this.beautifiedData, filterType);
    // adapt the input fields below in the hierarchy based on the added item
    // get the hierarchies below and execute the adaptPossibleSelections function
    
    // adapt inputfields based on last hierarchy

    this.getList(this._filter.lang, this._filter.from, this._filter.to);
  }

  /**
   * 
   * @param entriesToAdapt 
   * @param data 
   * @param filterType 
   */
  adaptPossibleSelections(entriesToAdapt, data: Report[], filterType: string) {
    let adaptedInputfield = [];
    if(entriesToAdapt) {
      if (entriesToAdapt.length === 1) {
        const compare = entriesToAdapt[0].filter;
        const compareType = entriesToAdapt[0].type;
        for (let i = 0; i < data.length; i++) {
          console.log(compare, data[i][`${compareType}`])
          if(compare.includes(data[i][`${compareType}`])) {
            adaptedInputfield.push(data[i][`${filterType}`]);
          } 
        }
      }
    } else {
      // handle the case when more than one hierarchy is selected above


    }
    console.log(uniq(adaptedInputfield))
    this.possibleSelections[`${filterType}`] = uniq(adaptedInputfield);
  }


  // returns the hierarchies above that were already filtered, that is the filter array
  // in the FilterConfig object is not empty
  // based on this information, one has to update all the other input fields in the hierarchies below
  filterHierarchiesAbove(hierarchy: number, filtertype: string) {
    const hierarchyAbove = hierarchy - 1;
    if (hierarchyAbove === 0) {
      return;
    } else {
      let hierarchiesAbove = []
      for (const el in this.filterConfig) {
        if(this.filterConfig[el].hierarchy <= hierarchyAbove && this.filterConfig[el].filter.length !== 0) {
          const elToPush = this.filterConfig[el];
          elToPush.type = el;
          hierarchiesAbove.push(elToPush);
        }
      }
      console.log(hierarchiesAbove)
      return hierarchiesAbove;
    } 
  }

  // updates every time when the user removes an entry in the filter
  onRemove($event, filterType: string): void {
    if (this.filterConfig.hasOwnProperty(`${filterType}`)) {
      this.filterConfig[`${filterType}`].filter = remove(this.filterConfig[`${filterType}`], (item: string) => {
        return item !== $event.label;
      });
    }
    this.getList(this._filter.lang, this._filter.from, this._filter.to);
  }

  checkHierarchy(filterType: string) {
    this.elementsAbove = [];
    this.elementsBelow = [];
    const hierarchy = this.getHierarchy(filterType);
    //const hierarchy = this.filterConfig[`${filterType}`].hierarchy;

    for (const el of ['canton', 'munic', 'epidemic_group', 'epidemic', 'animal_group', 'animal_species']) {
      if (this.filterConfig[el].hierarchy !== 0 && this.filterConfig[el].hierarchy > hierarchy) {
        this.elementsBelow[`${el}`] = this.filterConfig[el].filter
      }
      if (this.filterConfig[el].hierarchy !== 0 && this.filterConfig[el].hierarchy < hierarchy) {
        this.elementsAbove[`${el}`] = this.filterConfig[el].filter
        this.elementsAbove['hierarchy'] = this.filterConfig[el].hierarchy
      }
      // get the entry point of the filter
      if (this.filterConfig[el].hierarchy === 1) {
        this.filterEntryPoint = el;
      }
    }

    console.log(this.selectedCantons,
      this.selectedMunic,
      this.selectedEpidemicG,
      this.selectedEpidemic,
      this.selectedAnimalG,
      this.selectedAnimal)

    if (Object.entries(this.elementsBelow).length === 0 && this.elementsBelow.constructor === Object ) {
      return;
    }

    let elementBelowFiltered: boolean = false;
    for (const el in this.elementsBelow) {
      if(this.elementsBelow[el].length !== 0) {
        elementBelowFiltered = true;
      }
    }
    if(elementBelowFiltered) {
      this.showAlert = true;
    }


  }

  onClear($event: {}, filterType: string): void {
    if (this.filterConfig.hasOwnProperty(`${filterType}`)) {
      this.filterConfig[filterType].filter = [];
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

  orderItems(elementId: string, elToDisable: string, filterConfigKey: string): void {
    // set the order of the element
    this.stateOrder++;
    document.getElementById(elementId).style.order = `${this.stateOrder}`;
    this.hierarchy = this.hierarchy + 1;
    switch (filterConfigKey) {
      case ('canton'):
        this.filterConfig['canton'].hierarchy = this.hierarchy;
        this.filterConfig['canton'].position = this.stateOrder;
        this.filterConfig['munic'].hierarchy = this.hierarchy + 1;
        this.hierarchy = this.hierarchy + 1;
        break;
      case ('epidemic_group'):
        this.filterConfig['epidemic_group'].hierarchy = this.hierarchy;
        this.filterConfig['epidemic_group'].position = this.stateOrder;
        this.filterConfig['epidemic'].hierarchy = this.hierarchy + 1;
        this.hierarchy = this.hierarchy + 1;
        break;
      case ('animal_group'):
        this.filterConfig['animal_group'].hierarchy = this.hierarchy;
        this.filterConfig['animal_group'].position = this.stateOrder;
        this.filterConfig['animal_species'].hierarchy = this.hierarchy + 1;
        this.hierarchy = this.hierarchy + 1; break;
    }
    // disable the selected button
    $(elToDisable).prop('disabled', true);
    this.disable = true;
    // show the element
    document.getElementById(elementId).style.display = "flex";
  }

  onReset(elemId1: string, elemId2: string, elemId3: string): void {
    // this.showMunic = false;
    // this.toggleDisableInput(this.formCant, 'canton');
    // $('.moreMunic').prop('disabled', false);
    // reset and hide again the input fields
    this.resetModels();
    this.elementsAbove = [];
    this.elementsBelow = [];
    for (const el of ['canton', 'munic', 'epidemic_group', 'epidemic', 'animal_group', 'animal_species']) {
      this.filterConfig[el].filter = []; this.filterConfig[el].hierarchy = 0;
      if (el === 'canton') this.filterConfig[el].position = 0;
      if (el === 'epidemic_group') this.filterConfig[el].position = 0;
      if (el === 'animal_group') this.filterConfig[el].position = 0;
    }
    this.stateOrder = 0;
    this.hierarchy = 0;
    document.getElementById(elemId1).style.display = "none";
    document.getElementById(elemId2).style.display = "none";
    document.getElementById(elemId3).style.display = "none";
    // enable the buttons to select an entry point of the filter
    $('#cantonEntrypoint').prop('disabled', false);
    $('#epidemicEntryPoint').prop('disabled', false);
    $('#animalEntryPoint').prop('disabled', false);
    this.getList(this._filter.lang, this._filter.from, this._filter.to);
  }

  resetModels(): void {
    this.selectedCantons = [];
    this.selectedMunic = [];
    this.selectedEpidemicG = [];
    this.selectedEpidemic = [];
    this.selectedAnimalG = [];
    this.selectedAnimal = []
  }



  // transforms the data object properly to use it for the table,
  // and beatifies the data that we will filter
  // TODO: Replace REGEX with real value from query
  // private transformData(data: any[], originalData = false) {
  //   for (const el in data) {
  //     if (data.hasOwnProperty(el)) {
  //       this.beautifiedData.push({
  //         diagnosis_date: data[el].diagnose_datum.value,
  //         canton: data[el].kanton.value,
  //         canton_id: Number(/\d+/.exec(data[el].canton_id.value)[0]),
  //         munic: data[el].gemeinde.value,
  //         munic_id: Number(/\d+/.exec(data[el].munic_id.value)[0]),
  //         epidemic_group: data[el].seuchen_gruppe.value,
  //         epidemic: data[el].seuche.value,
  //         animal_group: data[el].tier_gruppe.value,
  //         animal_species: data[el].tierart.value
  //       });
  //     }
  //   }
  // }

  // extracts all the unique strings for every filter
  private extractFilterParts(data: Report[], filteredData) {
    if (!this.filterEntryPoint) {

      this.possibleSelections.cantons = uniq(map(filteredData, 'canton')).sort();
      this.possibleSelections.epidemicsGroups = uniq(map(filteredData, 'epidemic_group')).sort();
      this.possibleSelections.animalGroups = uniq(map(filteredData, 'animal_group')).sort();
    } else {
      console.log(data)
      switch (this.filterEntryPoint) {
        case ('canton'): this.possibleSelections.cantons = uniq(map(data, 'kanton.value')).sort();
          this.possibleSelections.epidemicsGroups = uniq(map(filteredData, 'epidemic_group')).sort();
          this.possibleSelections.animalGroups = uniq(map(filteredData, 'animal_group')).sort(); break;
        case ('epidemic_group'): this.possibleSelections.epidemicsGroups = uniq(map(data, 'seuchen_gruppe.value')).sort();
          this.possibleSelections.cantons = uniq(map(filteredData, 'canton')).sort();
          this.possibleSelections.animalGroups = uniq(map(filteredData, 'animal_group')).sort(); break;
        case ('animal_group'): this.possibleSelections.animalGroups = uniq(map(data, 'tier_gruppe.value')).sort();
          this.possibleSelections.cantons = uniq(map(filteredData, 'canton')).sort();
          this.possibleSelections.epidemicsGroups = uniq(map(filteredData, 'epidemic_group')).sort(); break;
      }
    }
    //this.cantons = uniq(map(filteredData, 'canton')).sort();
    //this.communities = uniq(map(filteredData, 'munic')).sort();
    // this.communities = [];
    this.possibleSelections.communities = uniq(this.extractSecondHierarchy(this.filterConfig.canton.filter, 'canton', 'munic')).sort();
    //this.epidemicsGroups = uniq(map(filteredData, 'epidemic_group')).sort();
    //this.epidemics = uniq(map(filteredData, 'epidemic')).sort();
    // this.epidemics = [];
    this.possibleSelections.epidemics = uniq(this.extractSecondHierarchy(this.filterConfig.epidemic_group.filter, 'epidemic_group', 'epidemic')).sort();
    //this.animalGroups = uniq(map(filteredData, 'animal_group')).sort();
    //this.animals = uniq(map(filteredData, 'animal_species')).sort();
    // this.animals = [];
    this.possibleSelections.animals = uniq(this.extractSecondHierarchy(this.filterConfig.animal_group.filter, 'animal_group', 'animal_species')).sort();
    // if(this.selectedAnimal.length===0 &&
    //       this.selectedAnimalG.length===0 &&
    //         this.selectedCantons.length===0 &&
    //           this.selectedMunic.length===0 &&
    //             this.selectedEpidemic.length===0 &&
    //               this.selectedEpidemicG.length===0) {
    //     this.selectedCantons = this.cantons
    //     this.selectedMunic = this.communities
    //     this.selectedEpidemicG = this.epidemicsGroups
    //     this.selectedEpidemic = this.epidemics
    //     this.selectedAnimalG = this.animalGroups
    //     this.selectedAnimal = this.animals
    //}
  }

  private extractSecondHierarchy(keys: string[], firstOrder: string, secondOrder: string) {
    if (keys.length !== 0) {
      let items = [];
      items = this.beautifiedData
        .filter((el) => keys.includes(el[firstOrder]))
        .map(obj => obj[secondOrder]);
      return (items);
    } else {
      let items = [];
      items = this.beautifiedData.map(el => {
        return el[secondOrder];
      });
      return (items);
    }
  }

  getFilterConfig(): FilterConfig {
    return this.filterConfig;
  }

  getHierarchy(filterType: string): number {
    let filterConfig = this.getFilterConfig();
    return filterConfig[filterType].hierarchy;
  }

  // filters the data object based on the selected entries from
  // the user in the currentFilter array
  // TODO: check function when multiple filters selected, at the dayjs
  // every entry of the currentFilter is filtered separately
  private filterDataObjectBasedOnEventData(data: Report[], filterObject: FilterConfig) {
    const filteredData = [];
    for (let i = 0; i < data.length; i++) {
      let insideFilter = false;
      if (this.checkFilter('canton', data[i]['canton'], filterObject)) {
        if (this.checkFilter('munic', data[i]['munic'], filterObject)) {
          if (this.checkFilter('epidemic_group', data[i]['epidemic_group'], filterObject)) {
            if (this.checkFilter('epidemic', data[i]['epidemic'], filterObject)) {
              if (this.checkFilter('animal_group', data[i]['animal_group'], filterObject)) {
                if (this.checkFilter('animal_species', data[i]['animal_species'], filterObject)) {
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

  private checkFilter(type: string, compare: string, filterObject: FilterConfig): boolean {
    return (filterObject[type].filter.length !== 0 && filterObject[type].filter.includes(compare)) || filterObject[type].filter.length === 0;
  }

  // Constructs the list of items for the input field.
  // @param possibleItems: items that can be selected. either they are in the selected time interval
  //        or they contain are part of a match when the user already filtered
  // @param uniqueItems: unnique items that could have an entry in the database in the future but don't have yet
  // Returns an object of type InputField and indicates which of them are selectable
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

  // Sorts an object of type InputField based on a key that has a value of type string
  private sortItems(inputField: InputField[], key: string): InputField[] {
    return inputField.sort((a: InputField, b: InputField) => {
      let x = a[key].trim().toLowerCase();
      let y = b[key].trim().toLowerCase();
      return x < y ? -1 : x > y ? 1 : 0;
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
      texts => {
        this.trans = texts;
        this.sortItem = this.trans['EVAL.DIAGNOSIS_DATE'];
      }
    );
  }

  retransformDate(date: string | Date): string {
    return date.toString().split('.').reverse().join("-");
  }


  // changes the date based on the datepickers
  onGetFromToDates(from: NgbDate, to: NgbDate): void {
    const fromdate = dayjs(from.year + '-' + from.month + '-' + from.day).format('YYYY-MM-DD');
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
      if ((moment(todate).diff(today)) > 0) {
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
      if (!(dayjs(fromdate).isValid()) || !(dayjs(todate).isValid())) {
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
        this.inputCantons = this.constructItemList(this.possibleSelections.cantons, this.allCantons);
      }, err => {
        this._notification.errorMessage(err.statusText + '<br>' + err.message, err.name);
      }
    );
  }
  onScrollUp(): void {
    window.scrollTo(0, 0);
  }

  private getList(lang: string, from: string | Date, to: string | Date): void {
    this._dataSub = this._sparqlDataService.getReports(lang, from, to).subscribe(
      (data: any[]) => {
        this.beautifiedData = data.map(report => {
          return {
            diagnosis_date: report.diagnose_datum.value,
            canton: report.kanton.value,
            canton_id: Number(/\d+/.exec(report.canton_id.value)[0]),
            munic: report.gemeinde.value,
            munic_id: Number(/\d+/.exec(report.munic_id.value)[0]),
            epidemic_group: report.seuchen_gruppe.value,
            epidemic: report.seuche.value,
            animal_group: report.tier_gruppe.value,
            animal_species: report.tierart.value
          } as Report;
        });
        this.getAllPossibleValues(lang);
        // this.transformData(data, false);
        this.filteredData = this.filterDataObjectBasedOnEventData(this.beautifiedData, this.filterConfig);
        this._distributeDataService.updateData(this.filteredData, from, to);
        this.extractFilterParts(data, this.filteredData);
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

  getSortItemAndOrder($event: Object): void {
    this.getTranslations();
    const column = $event['active'];
    const direction = $event['direction'];
    if (direction === 'asc') {
      this.sortDirection = this.trans['EVAL.ORDER_ASCENDING']; 
      this.sorted = true;
    } else if (direction === 'desc') {
      this.sortDirection = this.trans['EVAL.ORDER_DESCENDING']; 
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


  private getUniqueMunicipalities(): void {
    this._municSub = this._sparqlDataService.getUniqueMunicipalities().subscribe(
      uniqueMunic => {
        this.allCommunities = this.beautifyItems(uniqueMunic, 'gemeinde');
        this.inputCommunities = this.constructItemList(this.possibleSelections.communities, this.allCommunities);
      }, err => {
        this._notification.errorMessage(err.statusText + '<br>' + err.message, err.name)
      }
    );
  }

  private getUniqueEpidemicGroups(lang: string): void {
    this._epidemicsGroupSub = this._sparqlDataService.getUniqueEpidemicGroups(lang).subscribe(
      uniqueEpidGroup => {
        this.allEpidemicsGroups = this.beautifyItems(uniqueEpidGroup, 'seuchen_gruppe');
        this.inputEpidemicsGroup = this.constructItemList(this.possibleSelections.epidemicsGroups, this.allEpidemicsGroups);
      }, err => {
        this._notification.errorMessage(err.statusText + '<br>' + err.message, err.name)
      }
    );
  }
  // private extractSecondHierarchy(keys: string[], firstOrder: string, secondOrder: string) {
  //   // TODO: Document && return type
  //   if (keys.length !== 0) {
  //     return this.beautifiedData
  //       .filter((el) => keys.includes(el[firstOrder]))
  //       .map(obj => obj[secondOrder]);
  //     }
  //     return this.beautifiedData.map(el => el[secondOrder]);
  //   }

  private getUniqueEpidemics(lang: string): void {
    this._epidemicsSub = this._sparqlDataService.getUniqueEpidemics(lang).subscribe(
      uniqueEpid => {
        this.allEpidemics = this.beautifyItems(uniqueEpid, 'tier_seuche');
        this.inputEpidemics = this.constructItemList(this.possibleSelections.epidemics, this.allEpidemics);
      }, err => {
        this._notification.errorMessage(err.statusText + '<br>' + err.message, err.name)
      }
    );
  }

  private getUniqueAnimalGroups(lang: string): void {
    this._animalsGroupSub = this._sparqlDataService.getUniqueAnimalGroups(lang).subscribe(
      uniqueAnimalGroups => {
        this.allAnimalGroups = this.beautifyItems(uniqueAnimalGroups, 'tier_gruppe');
        this.inputAnimalGroups = this.constructItemList(this.possibleSelections.animalGroups, this.allAnimalGroups)
      }, err => {
        this._notification.errorMessage(err.statusText + '<br>' + err.message, err.name)
      }
    );
  }

  private getUniqueAnimals(lang: string): void {
    this._animalsSub = this._sparqlDataService.getUniqueAnimals(lang).subscribe(
      uniqueAnimals => {
        this.allAnimals = this.beautifyItems(uniqueAnimals, 'tier_art');
        this.inputAnimals = this.constructItemList(this.possibleSelections.animals, this.allAnimals);
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
