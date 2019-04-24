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
        // console.log(this.featureData);
      },
      err => console.log(err)
    );
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
    fill.setColor(`hsl(0, 59%, ${((id / 800000) * 100).toFixed()}%)`);
    return style;
  }

}
