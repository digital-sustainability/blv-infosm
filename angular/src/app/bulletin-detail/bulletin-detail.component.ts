import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatTableDataSource, MatSort, MatSortable } from '@angular/material';

@Component({
  selector: 'app-bulletin-detail',
  templateUrl: './bulletin-detail.component.html',
  styleUrls: ['./bulletin-detail.component.css']
})
export class BulletinDetailComponent implements OnInit {

  dataFromRoute;
  metaDataFromRoute;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  dataSource: any;
  element_data: any;
  displayedColumns: string[] = [ 'kanton', 'gemeinde', 'seuchen_gruppe', 'seuche', 'tierart', 'anzahl' ];


  constructor() { }

  ngOnInit() {
    this.dataFromRoute = JSON.parse(localStorage.getItem('detailData'));
    this.metaDataFromRoute = JSON.parse(localStorage.getItem('metaData'));

    this.element_data = [];

    this.transformDataToMaterializeTable();

    this.dataSource = new MatTableDataSource<any>(this.element_data);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    
  }

  private transformDataToMaterializeTable() {
    for (let element in this.dataFromRoute) {
      this.element_data.push({
        kanton: this.dataFromRoute[element].kanton,
        gemeinde: this.dataFromRoute[element].gemeinde,
        seuche: this.dataFromRoute[element].seuche,
        seuchen_gruppe: this.dataFromRoute[element].seuchen_gruppe,
        tierart: this.dataFromRoute[element].tierart,
        anzahl: 1
      });
    }
  }

}
