import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatTableDataSource, MatSort, MatTooltipModule } from '@angular/material';
import { SparqlDataService } from 'src/app/shared/sparql-data.service';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from 'src/app/shared/language.service';
import { Report } from '../models/report.model';
import * as moment from 'moment';
import * as _ from 'lodash';


@Component({
  selector: 'app-bulletin',
  templateUrl: './bulletin.component.html',
  styleUrls: ['./bulletin.component.css']
})
export class BulletinComponent implements OnInit {

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  dataSource: any;
  data: Report[];
  element_data: any;
  displayedColumns: string[] = ['nummer', 'dateFrom', 'dateTo', 'action'];
  startIntervals = [];
  endIntervals = [];
  startOfBulletin = moment('2008-11-17').format('YYYY-MM-DD');
  today = moment().format('YYYY-MM-DD');

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
        this.data = data;
        this.splitDataToIntervals(this.startOfBulletin, this.today);
        console.log(this.data);
        
        // Prepare data for table
        // remove all elements from element_data due to language change
        this.element_data = [];
        this.transformDataToMaterializeTable();
        this.dataSource = new MatTableDataSource<any>(this.element_data);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;

      }, err => {
        console.log(err);
        // TODO: Imporve error handling
      });
  }

  private splitDataToIntervals(startDate: Date | string, endDate: Date | string) {
    this.constructNumber(startDate)
    let tmpDate = startDate;
    while( tmpDate <= endDate ) {
      this.startIntervals.push(tmpDate);
      this.endIntervals.push(moment(tmpDate).add(6, 'days').format('YYYY-MM-DD'))
      tmpDate = moment(tmpDate).add(1, 'week').format('YYYY-MM-DD');
    }
    console.log(this.startIntervals)
    console.log(this.endIntervals)
  }

  private constructNumber(date: Date | string) {
    let year = moment(date).year();
    let week = moment(date).week();
    let result = (week <10 ) ? `${year}0${week}` : `${year}${week}`;
    console.log(result);
    return result;
  }

  private transformDataToMaterializeTable() {
    for (let i=0; i <= this.endIntervals.length; i++) {
      this.element_data.push({
        nummer: this.constructNumber(this.startIntervals[i]),
        dateFrom: this.startIntervals[i],
        dateTo: this.endIntervals[i],
        action: 'Details anzeigen'
      });
    }
  }

 

}
