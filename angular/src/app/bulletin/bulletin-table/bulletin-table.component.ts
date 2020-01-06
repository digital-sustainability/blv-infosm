import {
  AfterViewInit,
  Component,
  OnInit,
  ViewChild,
  Input,
  OnChanges,
  SimpleChanges
} from "@angular/core";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { MatTable } from "@angular/material/table";
import { BulletinTableDataSource } from "./bulletin-table-datasource";
import { Report } from "../../shared/models/report.model";

@Component({
  selector: "app-bulletin-table",
  templateUrl: "./bulletin-table.component.html",
  styleUrls: ["./bulletin-table.component.css"]
})
export class BulletinTableComponent
  implements AfterViewInit, OnInit, OnChanges {
  @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: false }) sort: MatSort;
  @ViewChild(MatTable, { static: false }) table: MatTable<Report>;
  @Input() reports: Report[];
  dataSource: BulletinTableDataSource;

  /** Columns displayed in the table. */
  displayedColumns = [
    "publication_date",
    "canton",
    "munic",
    "epidemic_group",
    "epidemic",
    "animal_species",
    "count"
  ];

  ngOnInit() {
    // TODO: Only init if data is present
    this.dataSource = new BulletinTableDataSource(this.reports);
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    this.table.dataSource = this.dataSource;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.dataSource) {
      for (const propName in changes) {
        if (changes.hasOwnProperty(propName)) {
          switch (propName) {
            case "reports": {
              this.dataSource = new BulletinTableDataSource(
                changes.reports.currentValue
              );
              this.dataSource.sort = this.sort;
              this.dataSource.paginator = this.paginator;
              this.table.dataSource = this.dataSource;
            }
          }
        }
      }
    }
  }
}
