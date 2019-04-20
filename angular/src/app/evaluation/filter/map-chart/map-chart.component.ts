import { Component, OnInit } from '@angular/core';
import { SparqlDataService } from '../../../shared/sparql-data.service';

@Component({
  selector: 'app-map-chart',
  templateUrl: './map-chart.component.html',
  styleUrls: ['./map-chart.component.css']
})
export class MapChartComponent implements OnInit {

  height = 400;

  featureData;

  constructor(
    private _sparqlDataService: SparqlDataService,
  ) { }


  ngOnInit() {
    this._sparqlDataService.getCantonsWkt().subscribe(
      wkts => {
        const features = []
        wkts.map(wkt => {
          features.push(
            {
              id: wkt[0].wkt.value.length,
              wkt: wkt[0].wkt.value
            }
          );
        });
        this.featureData = features;
        console.log(this.featureData);
      },
      err => console.log(err)
    );
  }

}
