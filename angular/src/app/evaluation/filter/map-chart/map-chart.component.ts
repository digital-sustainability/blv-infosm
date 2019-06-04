import { Component, OnInit } from '@angular/core';
import { SparqlDataService } from '../../../shared/sparql-data.service';
import { Report } from '../../../shared/models/report.model';
import { Subscription } from 'rxjs';
import { DistributeDataService } from 'src/app/shared/distribute-data.service';

@Component({
  selector: 'app-map-chart',
  templateUrl: './map-chart.component.html',
  styleUrls: ['./map-chart.component.css']
})
export class MapChartComponent implements OnInit {

  height = 400;

  dataSub: Subscription;
  reports: Report[];

  featureData = [];

  constructor(
    private _sparqlDataService: SparqlDataService,
    private _distributeDataService: DistributeDataService,
    ) { }

  onClick(event) {
    console.log(event);
  }
  ngOnInit() {
    this.dataSub = this._distributeDataService.currentData.subscribe(
      data => {
        if (data) {
          // this.ready = true;
          this.reports = data;
        }
      },
      err => console.log(err)
    );
    // console.time('Get WKT');
    // this._sparqlDataService.getCantonsWkt().subscribe(
    //   wkts => {
    //     const features = [];
    //     wkts.map(w => {
    //       features.push(
    //         {
    //           // id: w[0].wkt.value.length,
    //           // wkt: w[0].wkt.value,
    //           id: w.canton_id.value,
    //           wkt: w.wkt.value,
    //           canton: true
    //         }
    //       );
    //     });
    //     this.featureData = features;
    //     console.log(this.featureData);
    //     console.timeEnd('Get WKT');
    //   },
    //   err => console.log(err)
    // );

    this._sparqlDataService.getMunicForCanton(1).subscribe(
      wkts => {
        const features = [];
        wkts.map(w => {
          // TODO: add dynamic `belongsTo`
          features.push({
            id: w.munic_id.value,
            wkt: w.wkt.value,
            belongsTo: 1,
            canton: false
          });
        });
        this.featureData = features;
        console.log(wkts);
      },
      err => console.log(err)
    );
  }

  private sumEpidemicsPerCanton(reports: Report[], cantonId: number): number {
    return reports.filter(report => report.canton_id === cantonId).length;
  }

  private sumAllEpidemics(reports: Report[]): number {
    return reports.length;
  }

  private getRelativeColor(percent: number): any {
    return `hsl(0, 59%, ${(percent).toFixed()}%)`;
  }

}
