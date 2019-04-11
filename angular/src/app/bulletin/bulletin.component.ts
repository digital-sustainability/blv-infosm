import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatTableDataSource, MatSort, MatTooltipModule } from '@angular/material';
import { SparqlDataService } from 'src/app/shared/sparql-data.service';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from 'src/app/shared/language.service';
import { Report } from '../models/report.model';
import * as moment from 'moment';
import * as _ from 'lodash';
import { identifierModuleUrl } from '@angular/compiler';


@Component({
  selector: 'app-bulletin',
  templateUrl: './bulletin.component.html',
  styleUrls: ['./bulletin.component.css']
})
export class BulletinComponent implements OnInit {

  @ViewChild('d') datepicker;
  @ViewChild('c') datepicker2;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  dataSource: any;
  data: Object[];
  element_data: any;
  displayedColumns: string[] = ['nummer', 'dateFrom', 'dateTo', 'action'];
  startIntervals = [];
  endIntervals = [];
  startOfBulletin = moment('2008-11-17').format('YYYY-MM-DD');
  today = moment().format('YYYY-MM-DD');
  actionString = 'Details anzeigen'

  constructor(
    private _sparqlDataService: SparqlDataService,
    public translateService: TranslateService,
    private _langauageService: LanguageService,
  ) { }

  ngOnInit() {
    this.getList('de', this.startOfBulletin, this.today);
  }

  private getList(lang: string, from: string | Date, to: string | Date): void {
    this._sparqlDataService.getReports(lang, from, to).subscribe(
      data => {
        this.data = this.beautifyDataObject(data);
        this.splitDataToIntervals(this.startOfBulletin, this.today);
        console.log(this.data);
        
        // Prepare data for table
        // remove all elements from element_data due to language change
        this.element_data = [];

        this.transformDataToMaterializeTable();
        
        this.dataSource = new MatTableDataSource<any>(this.element_data);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.distributeDataToIntervals();
      }, err => {
        console.log(err);
        // TODO: Imporve error handling
      });
  }

  private splitDataToIntervals(startDate: Date | string, endDate: Date | string) {
    let tmpDate = startDate;
    while( tmpDate <= endDate ) {
      this.startIntervals.push(tmpDate);
      this.endIntervals.push(moment(tmpDate).add(6, 'days').format('YYYY-MM-DD'));
      tmpDate = moment(tmpDate).add(1, 'week').format('YYYY-MM-DD');
    }
  }

  private constructNumber(date: Date | string) {
    let year = moment(date).year();
    let week = moment(date).week();
    let result = (week <10 ) ? `${year}0${week}` : `${year}${week}`;
    return result;
  }

  private transformDataToMaterializeTable() {
    for (let i=0; i <= this.endIntervals.length; i++) {
      this.element_data.push({
        nummer: this.constructNumber(this.startIntervals[i]),
        dateFrom: this.startIntervals[i],
        dateTo: this.endIntervals[i],
        action: `${this.actionString}`
      });
    }
  }

  private beautifyDataObject(data: Object) {
    let reducedDataObject: any[]= [];
    for(let el in data) {
      reducedDataObject.push({
        diagnose_datum: data[el].diagnose_datum.value,
        kanton: data[el].kanton.value,
        gemeinde: data[el].gemeinde.value,
        seuche: data[el].seuche.value,
        seuchen_gruppe: data[el].seuchen_gruppe.value,
        tierart: data[el].tierart.value 
      })
    }
    return reducedDataObject.sort((a, b) => {
      // chain the dates togehter to compare digits for sorting the object
      let dA = parseInt(a['diagnose_datum'].replace(/\-/gi, ""));
      let dB = parseInt(b['diagnose_datum'].replace(/\-/gi, ""));
      if(dA > dB){
        return 1;
      }
      return -1;
    });
  }

  // distribute the data into the weekly intervals from the table
  // returns an object key: number(vgl table) and value: array of objects which fall into the weelky interval 
  private distributeDataToIntervals() {
    let res = {};
    let counter = 0;
    for (let o of this.data) {
      if (o['diagnose_datum'] < this.element_data[counter]['dateTo']) {
        if (!res[this.element_data[counter]['nummer']]) {
          res[this.element_data[counter]['nummer']] = [];
        }
        res[this.element_data[counter]['nummer']].push(o);
      } else {
        while (o['diagnose_datum'] > this.element_data[counter]['dateTo']) {
          counter++;
          if (o['diagnose_datum'] < this.element_data[counter]['dateTo']) {
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
    console.log(res);
  }

  private getFromToDates() {
    this.data = [];
    this.startIntervals = [];
    this.endIntervals = [];
    let from = this.datepicker._inputValue;
    let to = this.datepicker2._inputValue;
    this.getList('de', from, to);
  }

  private resetDates() {
    this.data = [];
    this.startIntervals = [];
    this.endIntervals = [];
    this.getList('de', this.startOfBulletin, this.today);
  }
 

}
