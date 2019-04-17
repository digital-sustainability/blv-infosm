import { Component, OnInit, AfterContentInit, ViewChild, ElementRef } from '@angular/core';
import { SparqlDataService } from '../../../shared/sparql-data.service';
import * as d3 from 'd3';
import ch from './shared/ch.json';
import sm from './shared/sm.json';
// import * as t from 'ts-topojson';
import * as topojson from 'topojson';

@Component({
  selector: 'app-map-chart',
  templateUrl: './map-chart.component.html',
  styleUrls: ['./map-chart.component.css']
})
export class MapChartComponent implements OnInit, AfterContentInit {

  @ViewChild('graphContainer') graphContainer: ElementRef;

  height = 400;

  featureData = [{
    id: 'myId',
    wkt: ''
  }];

  geojson = sm;
  topojson = ch;
  lakes = topojson.feature(this.topojson, this.topojson.objects.lakes);
  // lakes = ch.objects.lakes;
  munic = ch.objects.municipalities;
  cantons = ch.objects.cantons;

  constructor(
    private _sparqlDataService: SparqlDataService,
  ) { }


  ngOnInit() {
    this._sparqlDataService.getWkt('101').subscribe(
      wkt => {
        this.featureData[0].wkt = wkt[0].wkt.value;
        // const layer = document.ElementById<any>('ol-layer-wkt');
        // layer.featureData = this.featureData[0];
        console.log(this.featureData);
      },
      err => console.log(err)
    );
  }

  ngAfterContentInit() {
    console.log('geojson', this.geojson);
  }
}
