
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Report } from '../../shared/models/report.model';
import { NgbDate } from '../../shared/models/ngb-date.model';
import { InputField } from '../../shared/models/inputfield.model';
import { LanguageService } from 'src/app/shared/services/language.service';
import { Subscription } from 'rxjs';
import { MatPaginator, MatTableDataSource, MatSort, MatSortable } from '@angular/material';
import { ActivatedRoute, Router } from '@angular/router';
import { SparqlDataService } from 'src/app/shared/services/sparql-data.service';
import { DistributeDataService } from 'src/app/shared/services/distribute-data.service';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../shared/services/notification.service';
import { remove, uniq, map, filter } from 'lodash';
import { NgbDatepickerConfig, NgbDateParserFormatter, NgbDatepicker } from '@ng-bootstrap/ng-bootstrap';
import { NgbDateCHFormatter } from '../../shared/formatters/ngb-ch-date-formatter';
import { Translations } from '../../shared/models/translations.model';
import { FilterConfig } from '../../shared/models/filterConfig.model';
import { FormBuilder, FormGroup } from '@angular/forms';
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
  @ViewChild('selectCant') selectCant;
  @ViewChild('selectMunic') selectMunic;
  @ViewChild('selectAniG') selectAnig;
  @ViewChild('selectAni') selectAni;
  @ViewChild('selectEpiG') selectEpiG;
  @ViewChild('selectEpi') selectEpi;

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

  _filter = {
    lang: '',
    from: '',
    to: ''
  };

  selectedTab: string;

  trans: Translations;
  radioActive: boolean = true;

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
    canton: [],
    munic: [],
    epidemic_group: [],
    epidemic: [],
    animal_group: [],
    animal_species: []
  }

  // final selectable and disabled array of items that are visible in the input field
  inputCantons: InputField[];
  inputCommunities: InputField[];
  inputEpidemicsGroup: InputField[];
  inputEpidemics: InputField[];
  inputAnimalGroups: InputField[];
  inputAnimals: InputField[];

  loadCanton = true;
  loadMunic: boolean = true;
  loadEpidemicG: boolean = true;
  loadEpidemic: boolean = true;
  loadAnimalG: boolean = true;
  loadAnimal: boolean = true;

  filterEntryPoint: string = "";
  noFilter: boolean = true;
  stateOrder: number = 0;
  hierarchy: number = 0;
  elementsAbove = {};
  elementsBelow = {};
  showAlert: boolean = false;
  selected = [];
  disable: boolean = false;
  selectedAll: boolean = false;

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

  // needed to build the string above the table
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
    public translate: TranslateService,
    public ngbDatepickerConfig: NgbDatepickerConfig,
    private fb: FormBuilder
  ) { }

  ngOnInit() {
    // get child route entered by user
    const regex = /\/evaluation\/([a-zA-Z]*)\?/;
    const match = regex.exec(this._router.url);
    if (match && match.length > 1) {
      this.selectedTab = match[1];
    } else {
      this.selectedTab = 'map';
    }
    this._paramSub = this._route.queryParams.subscribe(
      params => {
        this._filter.lang = params['lang'];
        this._filter.from = params['from'];
        this._filter.to = params['to'];

        // Sets parmas if none detected or one is misssing
        if (!params['lang'] || !params['from'] || !params['to']) {
          const lang = this.translate.currentLang;
          const from = dayjs().subtract(1, 'y').format('YYYY-MM-DD');
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
          if (this._filter.lang !== this.translate.currentLang) {
            this._langauageService.changeLang(this._filter.lang);
          }
        }
      }
    );

    // If the languare changes through click, update param
    this._langSub = this._langauageService.currentLang.subscribe(
      lang => {
        if (this._filter.lang !== lang) {
          this.updateRouteParams({ lang: lang });
          this.resetFilterOnLangOrPeriodChange();
        }
      }, err => {
        // TODO: Imporve error handling
        this._notification.errorMessage(err.statusText + '<br>' + err.message, err.name);
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

    // set the initial state of the sorted table
    this.sortDirection = 'asc';
    this.sorted = true;

    // initialize all the forms (input fields)
    this.formCant = this.fb.group({ canton: ''});
    this.formMunic = this.fb.group({ munic: ''});
    this.formEpidG = this.fb.group({ epidemic_group: ''});
    this.formEpid = this.fb.group({ epidemic: ''});
    this.formAniG = this.fb.group({ animal_group: ''});
    this.formAni = this.fb.group({ animal_species: ''});
  }

  onChangeTab(route: string): void {
    this.selectedTab = route.substring(1); // remove slash
    this._router.navigate(['evaluation' + route], { queryParamsHandling: 'merge' });
  }

  ngOnDestroy(): void {
    this._langSub.unsubscribe();
    this._dataSub.unsubscribe();
    this._paramSub.unsubscribe();
    this._animalsGroupSub.unsubscribe();
    this._animalsSub.unsubscribe();
    this._cantonsSub.unsubscribe();
    this._epidemicsGroupSub.unsubscribe();
    this._epidemicsSub.unsubscribe();
    this._municSub.unsubscribe();
    this._translationSub.unsubscribe();
  }

 /**
  * Updates every time when the user adds an entry in the filter. Adapts the possible
  * selections in the inputfileds in an "OR" logic based on the selections the user made
  * in the hierarchies above
  */
  onAdd($event, filterType: string): void {
    this.mapLoadingInputField(filterType);
    this.checkHierarchy(filterType);
    let selectedItem = [];
    selectedItem = $event.label;
    if (this.filterConfig.hasOwnProperty(filterType)) {
      this.filterConfig[filterType].filter.push(selectedItem.toString());
    }

    const actualHierarchy = this.getHierarchy(filterType);
    if ([2, 4, 6].includes(actualHierarchy)) {
      let elAbove: string = "";
      switch (filterType) {
        case 'animal_species': elAbove = 'animal_group'; break;
        case 'epidemic': elAbove = 'epidemic_group'; break;
        case 'munic': elAbove = 'canton'; break;
      }
      let forms = this.getCorrespondingForms(elAbove);
      this.toggleDisableInput(forms[0], elAbove);
    }
    const entriesToAdatpInputs = this.filterHierarchiesAbove(actualHierarchy);
    this.adaptPossibleSelections(entriesToAdatpInputs, this.beautifiedData, filterType);
    this.getList(this._filter.lang, this._filter.from, this._filter.to);
  }

  /**
   * Filters the data based on the selected items in the hierarchies above, identifies which 
   * inputfields need to be updated and extracts all the unique items for the input fields 
   * that need to be adapted
   * @param entriesToAdapt entries based on which the possible selections of the input field should be adapted 
   * @param data the based on the currently selected period of time
   * @param filterType the type of the filter that has been changed
   */
  adaptPossibleSelections(entriesToAdapt, data: Report[], filterType: string) {
    // this part filters the data based on the selected items in the hierarchies above
    let filtered: Report[] = [];
    if (entriesToAdapt.length !== 0) {
      const numberOfFiltersAbove: number = entriesToAdapt.length;
      for (let i = 0; i < data.length; i++) {
        let inside: boolean = false;
        for (let j = 0; j < numberOfFiltersAbove; j++) {
          if (entriesToAdapt[j].filter.includes(data[i][entriesToAdapt[j].type])) {
            inside = true;
          } else {
            inside = false;
            break;
          }
        }
        if (inside) {
          filtered.push(data[i]);
        }
      }
    } else {
      filtered = data;
    }

    // this part identifies the inputfields that need to be updated
    const elAbove = filter(uniq(Object.keys(this.elementsAbove)), (item: string) => {
      return item !== 'hierarchy';
    });
    const fieldsToAdapt = remove(['canton', 'munic', 'epidemic_group', 'epidemic', 'animal_group', 'animal_species'], (item: string) => {
      return item !== filterType && !elAbove.includes(item);
    });

    for (const el of fieldsToAdapt) {
      this.setPossibleSelections(el, this.extractUniqueItems(filtered, el));
    }
   
  }

  /**
   * Sets the key and the value of the possible selections the user can choose from. 
   * Needs to be adapted after every change the user makes to an input field
   */
  setPossibleSelections(key: string, value: string[]): void {
    this.possibleSelections[key] = value;
  }

  /**
   * Extracts all the unique items of the filtered data for a specific key.
   * @param data the filtered data after the user changed an input field
   * @param key the key of the fltered data object you want the unique items from
   */
  extractUniqueItems(data: Report[], key: string): string[] {
    const uniqueItems: string[] = [];
    for (let i = 0; i < data.length; i++) {
      uniqueItems.push(data[i][key]);
    }
    return uniq(uniqueItems);
  }

  /**
   * Returns the hierarchies above that were already filtered, given that the filter array
   * in the FilterConfig is not empty.
   * Based on this information, one has to update all the other input fields in the hierarchies below.
   * @param hierarchy the hierarchy of the input field that the user has changed
   */
  filterHierarchiesAbove(hierarchy: number) {
    const hierarchiesAbove = [];
    for (const el in this.filterConfig) {
      if (this.filterConfig[el].hierarchy <= hierarchy && this.filterConfig[el].filter.length !== 0) {
        const elToPush = this.filterConfig[el];
        elToPush.type = el;
        hierarchiesAbove.push(elToPush);
      }
    }
    return hierarchiesAbove;
  }

  /**
   * Adapts the input fields based on the item in a specific input field that the user 
   * has removed. If the filter in the actual hierarchy is empty, we adapt the input 
   * fields based on the filter type above in the hierarchy. Else we adapt the input
   * fields based on the actual hierarchy
   * @param $event the object of the item, that has been removed by the user
   * @param filterType the type of the filter, where the user removed an item
   */
  onRemove($event, filterType: string): void {
    this.mapLoadingInputField(filterType);
    if (this.filterConfig.hasOwnProperty(filterType)) {
      this.filterConfig[filterType].filter = filter(this.filterConfig[filterType].filter, (item: string) => {
        return item !== $event.label;
      });
    }
    this.adaptLogicOfRemove(filterType);
    this.getList(this._filter.lang, this._filter.from, this._filter.to);
  }

  onClearAll(filterType: string): void {
    this.mapLoadingInputField(filterType);
    if (this.filterConfig.hasOwnProperty(filterType)) {
      this.filterConfig[filterType].filter = [];
    }
    this.adaptLogicOfRemove(filterType);
    this.getList(this._filter.lang, this._filter.from, this._filter.to);
  }

  adaptLogicOfRemove(filterType: string): void {
    const remainingItems = this.filterConfig[filterType].filter.length;
    let filterTypeAbove = '';
    switch (filterType) {
      case 'animal_species': filterTypeAbove = 'animal_group'; break;
      case 'epidemic': filterTypeAbove = 'epidemic_group'; break;
      case 'munic': filterTypeAbove = 'canton'; break;
    }

    if (remainingItems !== 0 || filterTypeAbove === '') {
      const actualHierarchy = this.getHierarchy(filterType);
      const entriesToAdatpInputs = this.filterHierarchiesAbove(actualHierarchy);
      this.adaptPossibleSelections(entriesToAdatpInputs, this.beautifiedData, filterType);
    } else {
      const actualHierarchy = this.getHierarchy(filterTypeAbove);
      const entriesToAdatpInputs = this.filterHierarchiesAbove(actualHierarchy);
      this.adaptPossibleSelections(entriesToAdatpInputs, this.beautifiedData, filterTypeAbove); 
    }
  }

  mapLoadingInputField(filterType: string): void {
    switch (filterType) {
      case 'canton': this.loadCanton = true; this.loadMunic = true; break;
      case 'munic': this.loadMunic = true; break;
      case 'epidemic_group': this.loadEpidemicG = true; this.loadEpidemic = true; break;
      case 'epidemic': this.loadEpidemic = true; break;
      case 'animal_group': this.loadAnimalG = true; this.loadAnimal = true; break;
      case 'animal_species': this.loadAnimal = true; break;
    }
  }

  /**
   * Checks the hierarchy of a filter type and splits the the filter types into two groups:
   * the group above and the group below the current filter type
   * @param filterType the type of the filter that is changed
   */
  checkHierarchy(filterType: string) {
    this.elementsAbove = [];
    this.elementsBelow = [];
    const hierarchy = this.getHierarchy(filterType);
    for (const el of ['canton', 'munic', 'epidemic_group', 'epidemic', 'animal_group', 'animal_species']) {
      if (this.filterConfig[el].hierarchy !== 0 && this.filterConfig[el].hierarchy > hierarchy) {
        this.elementsBelow[el] = this.filterConfig[el].filter;
      }
      if (this.filterConfig[el].hierarchy !== 0 && this.filterConfig[el].hierarchy <= hierarchy) {
        this.elementsAbove[el] = this.filterConfig[el].filter;
        this.elementsAbove['hierarchy'] = this.filterConfig[el].hierarchy;
      }
      // get the entry point of the filter
      if (hierarchy === 1 || !this.filterEntryPoint) {
        this.filterEntryPoint = el;
      }
    }
  }

  onSelectAll(input: InputField[], formControlName: string, form: FormGroup): void {
    this.selectedAll = true;
    const selectedRaw = input.filter(item => !(item['disabled']));
    // put the selected values into the form
    form.get(formControlName).patchValue(selectedRaw);

    // adapt the values for the filter logic
    this.filterConfig[formControlName].filter = selectedRaw.map(el => el.label);
    this.possibleSelections[formControlName] = selectedRaw.map(el => el.label);

    // disable selected field
    this.toggleDisableInput(form, formControlName);
    this.closeDropdown(this.getDropdownToClose(formControlName));

    if (['munic', 'epidemic', 'animal_species'].includes(formControlName)) {
      const next = this.getNextHigherHierarchy(formControlName);
      const nextForm =  this.getCorrespondingForms(formControlName)[0];
      this.toggleDisableInput(nextForm, next);
    }
  }

  getNextHigherHierarchy(filterType: string): string {
    switch(filterType) {
      case 'munic': return 'canton';
      case 'epidemic': return 'epidemic_group';
      case 'animal_species': return 'animal_group';
    }
  }

  closeDropdown(elRef): void {
    elRef.close();
  }

  getDropdownToClose(filterType: string) {
    switch(filterType) {
      case 'canton': return this.selectCant;
      case 'munic': return this.selectMunic;
      case 'epidemic_group': return this.selectEpiG;
      case 'epidemic': return this.selectEpi;
      case 'animal_group': return this.selectAnig;
      case 'animal_species': return this.selectAni;
    }

  }

  // onClearAll(formControlName: string, form: FormGroup): void {
  //   form.get(formControlName).patchValue([]);
  // }

  /**
   * Determines dynamically the properties hierarchy and position of the FIlterConfig and disables 
   * the buttons that are already selected.
   * @param elementId the id of the html input field which is selected
   * @param elToDisable the id of the html button to disable
   * @param filterConfigKey the key of the FilterConfig to handle next
   */
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
        this.selected.push(['canton', 'munic']);
        this.inputFieldsToDisabled(this.selected);
        this.hierarchy = this.hierarchy + 1;
        break;
      case ('epidemic_group'):
        this.filterConfig['epidemic_group'].hierarchy = this.hierarchy;
        this.filterConfig['epidemic_group'].position = this.stateOrder;
        this.filterConfig['epidemic'].hierarchy = this.hierarchy + 1;
        this.selected.push(['epidemic_group', 'epidemic']);
        this.inputFieldsToDisabled(this.selected);
        this.hierarchy = this.hierarchy + 1;
        break;
      case ('animal_group'):
        this.filterConfig['animal_group'].hierarchy = this.hierarchy;
        this.filterConfig['animal_group'].position = this.stateOrder;
        this.filterConfig['animal_species'].hierarchy = this.hierarchy + 1;
        this.selected.push(['animal_group', 'animal_species']);
        this.inputFieldsToDisabled(this.selected);
        this.hierarchy = this.hierarchy + 1;
        break;
    }
    // disable the selected button
    $(elToDisable).prop('disabled', true);
    this.disable = true;
    // show the element
    document.getElementById(elementId).style.display = "flex";
  }

  /**
   * Deterimnes which input fields get automatically disabled, based on the clicks of the user
   * @param selected an array of subsequent hierarcies that belong together, eg ['canton', 'munic']
   */
  inputFieldsToDisabled(selected: string[]): void {
    if (selected.length === 1) {
      return;
    } else if (selected.length === 2) {
      let firstToDisable = selected[0];
      let forms = this.getCorrespondingForms(firstToDisable[0]);
      this.toggleDisableInput(forms[0], firstToDisable[0]);
      this.toggleDisableInput(forms[1], firstToDisable[1]);
    } else {
      let secondToDisable = selected[1];
      let forms = this.getCorrespondingForms(secondToDisable[0]);
      this.toggleDisableInput(forms[0], secondToDisable[0]);
      this.toggleDisableInput(forms[1], secondToDisable[1]);
    }
  }

  /**
   * Returns the corresponding forms based on the filter types of the first hierarchy.
   * @param selected the selected filter type of the first hierarchy
   */
  getCorrespondingForms(selected: string): FormGroup[] {
    if (selected === 'canton' || selected === 'munic') {
      return [this.formCant, this.formMunic];
    } else if (selected === 'epidemic_group' || selected === 'epidemic') {
      return [this.formEpidG, this.formEpid];
    } else if (selected === 'animal_group' || selected === 'animal_species') {
      return [this.formAniG, this.formAni];
    }
  }

  toggleDisableInput(formGroup: FormGroup, formName: string) {
    if (formGroup.controls[formName].enabled) {
      formGroup.controls[formName].disable();
    }
  }

  getFilterConfig(): FilterConfig {
    return this.filterConfig;
  }

  getHierarchy(filterType: string): number {
    let filterConfig = this.getFilterConfig();
    return filterConfig[filterType].hierarchy;
  }

  resetFilterOnLangOrPeriodChange(): void {
    if(this.checkActiveFilter()) {
      this.onReset();
    };
  }

  private checkActiveFilter(): boolean {
    for(const el in this.filterConfig) {
      if(this.filterConfig[el].filter.length !== 0) {
        return true;
      }
    }
    return false;
  }

  /**
   * Resets everything that helps to build the logic of the filter, hides and enables 
   * all the input fields and enables again the buttons to build the hierarchy of the filter
   */
  onReset(): void {
    this.filterEntryPoint = "";
    this.resetModels();
    this.elementsAbove = [];
    this.elementsBelow = [];
    for (const el of ['canton', 'munic', 'epidemic_group', 'epidemic', 'animal_group', 'animal_species']) {
      this.filterConfig[el].filter = [];
      this.filterConfig[el].hierarchy = 0;
      if (el === 'canton') this.filterConfig[el].position = 0;
      if (el === 'epidemic_group') this.filterConfig[el].position = 0;
      if (el === 'animal_group') this.filterConfig[el].position = 0;
    }
    this.stateOrder = 0;
    this.hierarchy = 0;
    document.getElementById('who').style.display = "none";
    document.getElementById('what').style.display = "none";
    document.getElementById('where').style.display = "none";
    // enable the buttons to select an entry point of the filter
    $('#cantonEntrypoint').prop('disabled', false);
    $('#epidemicEntryPoint').prop('disabled', false);
    $('#animalEntryPoint').prop('disabled', false);
    this.selected = [];
    this.checkDisabledInputFields();
    this.getList(this._filter.lang, this._filter.from, this._filter.to);
  }

  /**
   * Checks which input fields are disabled and enables them if they are disabled.
   */
  checkDisabledInputFields(): void {
    if (this.formAni.controls['animal_species'].disabled) { this.formAni.controls['animal_species'].enable() };
    if (this.formEpid.controls['epidemic'].disabled) { this.formEpid.controls['epidemic'].enable() };
    if (this.formMunic.controls['munic'].disabled) { this.formMunic.controls['munic'].enable() };
    if (this.formCant.controls['canton'].disabled) { this.formCant.controls['canton'].enable() };
    if (this.formEpidG.controls['epidemic_group'].disabled) { this.formEpidG.controls['epidemic_group'].enable() };
    if (this.formAniG.controls['animal_group'].disabled) { this.formAniG.controls['animal_group'].enable() };
  }

  resetModels(): void {
    this.formAni.get('animal_species').setValue([]);
    this.formAniG.get('animal_group').setValue([]);
    this.formCant.get('canton').setValue([]);
    this.formMunic.get('munic').setValue([]);
    this.formEpid.get('epidemic').setValue([]);
    this.formEpidG.get('epidemic_group').setValue([]);
  }

  /**
   * Extracts all the unique strings for every input field in the initial state (based on the 
   * time period the user selected).
   * @param filteredData initial data filtered based on the selected period
   */
  private extractFilterParts(filteredData): void {
    if (this.filterEntryPoint.length === 0 ) {
      for(const el of ['canton', 'munic', 'epidemic_group', 'epidemic', 'animal_group', 'animal_species']) {
        this.possibleSelections[el] = uniq(map(filteredData, el)).sort();
      }
    }
  }

  /**
   * Filters the data object based on the selected entries that are stored in the FIlterConfig.
   * The logic of the filter is "AND".
   * @param data the whole data for the currently selected time interval
   * @param filterObject the configuration of the filter (selected values in the input fields)
   */
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
          // Add IDs to data for map component
          canton_id: data[i]['canton_id'],
          munic_id: data[i]['munic_id'],
        });
      }
    }
    return filteredData;
  }

  /**
   * Check that is made for every entry of the initial data of the selected
   * time interval to filter the data to check the "AND" logic.
   * @param type the key of the FilterCOnfig that is checked
   * @param compare the value of the whole data to compare with
   * @param filterObject the current FilterConfig
   */
  private checkFilter(type: string, compare: string, filterObject: FilterConfig): boolean {
    return (filterObject[type].filter.length !== 0 && filterObject[type].filter.includes(compare)) || filterObject[type].filter.length === 0;
  }

  /**
   * Constructs the list of items for the input field.
   * @param possibleItems  items that can be selected. either they are in the selected time interval
   *       or they contain are part of a match when the user already filtered
   * @param uniqueItems unnique items that could have an entry in the database in the future but don't have yet
   * Returns an object of type InputField and indicates which of them are selectable
   */
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
      let x = a[key].replace(/\s/g, "").toLowerCase();
      let y = b[key].replace(/\s/g, "").toLowerCase();
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

  /**
   * Constructs the table below the charts with the filtered data. Sorts the 
   * filtered data by default by diagnosis date in descending order.
   * @param filteredData 
   */
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
    this.resetFilterOnLangOrPeriodChange();
    this.radioActive = true;
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

    // remove the errors from the datepicker if the user switches 
    this.removeErrors();
  }

  /**
   * Retransforms a date from DD.MM.YYYY (CH-format) to YYYY-MM-DD.
   */
  retransformDate(date: string | Date): string {
    return date.toString().split('.').reverse().join("-");
  }

  // Changes the date based on the datepickers and validates the input in the date picker.
  onGetFromToDates(from: NgbDate, to: NgbDate): void {
    const fromdate = this.retransformDate(this.datepickerFrom['_inputValue']);
    const todate = this.retransformDate(this.datepickerTo['_inputValue']);
    // const fromdate = dayjs(from.year + '-' + from.month + '-' + from.day).format('YYYY-MM-DD');
    // const todate = dayjs(to.year + '-' + to.month + '-' + to.day).format('YYYY-MM-DD');
    const dateOfFirstEntry = dayjs('1991-01-15').format('YYYY-MM-DD');
    const today = dayjs().format('YYYY-MM-DD');
    this.removeErrors();
    if (dayjs(fromdate).isValid() && dayjs(todate).isValid() && fromdate.length === 10 && todate.length === 10) {
      //TODO: TRANSLATIONS --> not correct
      if (fromdate > todate) {
        $('.notValid').after(
          `<p class='err' style='color:red' id='datecompareerror'>${this.trans['EVAL.DATE_WRONG_ORDER']}</p>`
        );
        return;
      }
      if ((dayjs(todate).diff(fromdate, 'day')) < 7) {
        $('.notValid').after(
          `<p class='err' style='color:red' id='dateuniterror'>${this.trans['EVAL.DATE_TOO_SMALL']}</p>`
        );
        return;
      }
      if ((dayjs(fromdate).diff(dateOfFirstEntry, 'day')) < 0) {
        $('.notValid').after(
          `<p class='err' style='color:red' id='datefromerror'>${this.trans['EVAL.DATE_FROM_WRONG_RANGE']}</p>`
        );
        return;
      }
      if ((dayjs(todate).diff(today, 'day')) > 0) {
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
      // uncheck all radio buttons since either you search for period or for specific dates
      $('.radio').prop('checked', false);
      this.radioActive = false;
    } else {
      debugger
      if (!(dayjs(fromdate).isValid()) || !(dayjs(todate).isValid()) || fromdate.length === 10 || todate.length === 10) {
        $('.notValid').after(
          `<p class='err' style='color:red' id='dateformaterror'>${this.trans['EVAL.DATE_WRONG_FORMAT']}</p>`
        );
      }
    }
  }

  onScrollUp(): void {
    window.scrollTo(0, 0);
  }

  removeErrors(): void {
    $('#dateformaterror').remove();
    $('#datecompareerror').remove();
    $('#dateuniterror').remove();
    $('#datefromerror').remove();
    $('#datetoerror').remove();
  }

  getSortItemAndOrder($event: Object): void {
    const column = $event['active'];
    const direction = $event['direction'];
    if (direction === 'asc') {
      this.sortDirection = this.trans['EVAL.ORDER_ASCENDING'];
      this.sorted = true;
    } else if (direction === 'desc') {
      this.sortDirection = this.trans['EVAL.ORDER_DESCENDING'];
      this.sorted = true;
    } else {
      this.sorted = false;
      return;
    }
    switch (column) {
      case 'canton': this.sortItem = this.trans['EVAL.CANTON']; break;
      case 'munic': this.sortItem = this.trans['EVAL.MUNICIPALITY']; break;
      case 'epidemic': this.sortItem = this.trans['EVAL.PEST']; break;
      case 'epidemic_group': this.sortItem = this.trans['EVAL.PEST_GROUP']; break;
      case 'animal_species': this.sortItem = this.trans['EVAL.ANIMAL_SPECIES']; break;
      default: this.sortItem = this.trans['EVAL.DIAGNOSIS_DATE'];
    }
  }


  private getList(lang: string, from: string | Date, to: string | Date): void {
    this._dataSub = this._sparqlDataService.getReports(lang, from, to).subscribe(
      (data: any[]) => {
        this.beautifiedData = data.map(d => {
          return {
            diagnosis_date: d.diagnose_datum.value,
            canton: d.kanton.value,
            canton_id: Number(d.canton_id.value),
            munic: d.gemeinde.value,
            munic_id: Number(d.munic_id.value),
            epidemic_group: d.seuchen_gruppe.value,
            epidemic: d.seuche.value,
            // Capitalize first letter
            animal_group: d.tier_gruppe.value[0].toUpperCase() + d.tier_gruppe.value.slice(1),
            animal_species: d.tierart.value[0].toUpperCase() + d.tierart.value.slice(1)
          } as Report;
        });
        this.getTranslations();
        this.getAllPossibleValues(lang);
        // this.transformData(data, false);
        this.filteredData = this.filterDataObjectBasedOnEventData(this.beautifiedData, this.filterConfig);

        this._distributeDataService.updateData(this.filteredData, from, to);
        this.extractFilterParts(this.filteredData);
        this.constructTable(this.filteredData);

        // Set `from` and `to` for datepicker to match the current date selection
        this.from = this.transformDate(from);
        this.to = this.transformDate(to);
      }, err => {
        this._notification.errorMessage(err.statusText + '<br>' + err.message, err.name);
        // TODO: Imporve error handling
      });
  }

  private getTranslations(): void {
    this._translationSub = this.translate.get([
      'FILTER.DATE_COMPARE_ERROR',
      'FILTER.DATE_PERIOD_ERROR',
      'FILTER.DATE_FROM_ERROR',
      'FILTER.DATE_TO_ERROR',
      'FILTER.DATE_FORMAT_ERROR',
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
      'EVAL.DIAGNOSIS_DATE']).subscribe(
        texts => {
          this.trans = texts;
          this.sortItem = this.trans['EVAL.DIAGNOSIS_DATE'];
      }
    );
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
        this.inputCantons = this.constructItemList(this.possibleSelections.canton, this.allCantons);
        this.loadCanton = false;
      }, err => {
        this._notification.errorMessage(err.statusText + '<br>' + err.message, err.name);
      }
    );
  }

  private getUniqueMunicipalities(): void {
    this._municSub = this._sparqlDataService.getUniqueMunicipalities().subscribe(
      uniqueMunic => {
        this.allCommunities = this.beautifyItems(uniqueMunic, 'gemeinde');
        this.inputCommunities = this.constructItemList(this.possibleSelections.munic, this.allCommunities);
        this.loadMunic = false;
      }, err => {
        this._notification.errorMessage(err.statusText + '<br>' + err.message, err.name)
      }
    );
  }

  private getUniqueEpidemicGroups(lang: string): void {
    this._epidemicsGroupSub = this._sparqlDataService.getUniqueEpidemicGroups(lang).subscribe(
      uniqueEpidGroup => {
        this.allEpidemicsGroups = this.beautifyItems(uniqueEpidGroup, 'seuchen_gruppe');
        this.inputEpidemicsGroup = this.constructItemList(this.possibleSelections.epidemic_group, this.allEpidemicsGroups);
        this.loadEpidemicG = false;
      }, err => {
        this._notification.errorMessage(err.statusText + '<br>' + err.message, err.name)
      }
    );
  }

  private getUniqueEpidemics(lang: string): void {
    this._epidemicsSub = this._sparqlDataService.getUniqueEpidemics(lang).subscribe(
      uniqueEpid => {
        this.allEpidemics = this.beautifyItems(uniqueEpid, 'tier_seuche');
        this.inputEpidemics = this.constructItemList(this.possibleSelections.epidemic, this.allEpidemics);
        this.loadEpidemic = false;
      }, err => {
        this._notification.errorMessage(err.statusText + '<br>' + err.message, err.name)
      }
    );
  }

  private getUniqueAnimalGroups(lang: string): void {
    this._animalsGroupSub = this._sparqlDataService.getUniqueAnimalGroups(lang).subscribe(
      uniqueAnimalGroups => {
        this.allAnimalGroups = this.beautifyItems(uniqueAnimalGroups, 'tier_gruppe');
        this.inputAnimalGroups = this.constructItemList(this.possibleSelections.animal_group, this.allAnimalGroups);
        this.loadAnimalG = false;
      }, err => {
        this._notification.errorMessage(err.statusText + '<br>' + err.message, err.name)
      }
    );
  }

  private getUniqueAnimals(lang: string): void {
    this._animalsSub = this._sparqlDataService.getUniqueAnimals(lang).subscribe(
      uniqueAnimals => {
        this.allAnimals = this.beautifyItems(uniqueAnimals, 'tier_art');
        this.inputAnimals = this.constructItemList(this.possibleSelections.animal_species, this.allAnimals);
        this.loadAnimal= false;
      }, err => {
        this._notification.errorMessage(err.statusText + '<br>' + err.message, err.name)
      }
    );
  }

  private beautifyItems(item: any[], type: string): string[] {
    let niceItems: string[] = [];
    item.forEach(entry => {
      if(type === 'tier_art' || type === 'tier_gruppe') {
        niceItems.push(entry[type]['value'][0].toUpperCase() + entry[type]['value'].slice(1));
      } else {
        niceItems.push(entry[type]['value']);
      }
    });
    return niceItems;
  }
}

 // this.selectedCantons = [];
    // this.selectedMunic = [];
    // this.selectedEpidemicG = [];
    // this.selectedEpidemic = [];
    // this.selectedAnimalG = [];
    // this.selectedAnimal = []

    // the currently selected items for every input field
  // selectedCantons = [];
  // selectedMunic = [];
  // selectedEpidemicG = [];
  // selectedEpidemic = [];
  // selectedAnimalG = [];
  // selectedAnimal = []

   // this.possibleSelections.canton = uniq(map(filteredData, 'canton')).sort();
      // this.possibleSelections.munic = uniq(map(filteredData, 'munic')).sort();

      // this.possibleSelections.epidemic_group = uniq(map(filteredData, 'epidemic_group')).sort();
      // this.possibleSelections.epidemic = uniq(map(filteredData, 'epidemic')).sort();

      // this.possibleSelections.animal_group = uniq(map(filteredData, 'animal_group')).sort();
      // this.possibleSelections.animal_species = uniq(map(filteredData, 'animal_species')).sort();