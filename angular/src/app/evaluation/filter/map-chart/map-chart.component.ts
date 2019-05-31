import { Component, OnInit } from '@angular/core';
import { SparqlDataService } from '../../../shared/sparql-data.service';
import { Fill, Stroke, Style } from 'ol/style';

@Component({
  selector: 'app-map-chart',
  templateUrl: './map-chart.component.html',
  styleUrls: ['./map-chart.component.css']
})
export class MapChartComponent implements OnInit {

  height = 400;

  featureData = [];

  constructor(
    private _sparqlDataService: SparqlDataService,
  ) { }


  ngOnInit() {
    console.time('Get WKT');
    this._sparqlDataService.getCantonsWkt().subscribe(
      wkts => {
        const features = [];
        wkts.map(w => {
          features.push(
            {
              // id: w[0].wkt.value.length,
              // wkt: w[0].wkt.value,
              // Take Canton digit as ID. TODO: Retreive via query
              id: w.canton_id.value,
              wkt: w.wkt.value,
              canton: true
            }
            );
          });
          this.featureData = features;
        console.log(this.featureData);
        console.timeEnd('Get WKT');
      },
      err => console.log(err)
    );

    // this._sparqlDataService.getMunicForCanton(1).subscribe(
    //   wkts => {
    //     const features = [];
    //     wkts.map(w => {
    //       features.push({
    //         id: w.munic_id.value,
    //         wkt: w.wkt.value,
    //         canton: false
    //       });
    //     });
    //     this.featureData = features;
    //     console.log(wkts);
    //   },
    //   err => console.log(err)
    // );
  }

  getStackedStyle(feature) {
    const fill = new Fill();
    const style = new Style({
      fill: fill,
      stroke: new Stroke({
        color: '#333',
        width: 1,
      }),
    });
    const id = feature.getId();
    fill.setColor(`hsl(0, 59%, ${(id * 2).toFixed()}%)`);
    return style;
  }

}
