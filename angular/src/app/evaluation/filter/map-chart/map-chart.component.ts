import { Component, OnInit, AfterViewInit } from '@angular/core';
import { SparqlDataService } from '../../../shared/sparql-data.service';
import { Report } from '../../../shared/models/report.model';
import { Subscription } from 'rxjs';
import { DistributeDataService } from 'src/app/shared/distribute-data.service';


import OlMap from 'ol/Map';
import OlXYZ from 'ol/source/XYZ';
import OlTileLayer from 'ol/layer/Tile';
import WKT from 'ol/format/WKT';
import OlView from 'ol/View';
import { fromLonLat } from 'ol/proj';

import olMap from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import View from 'ol/View';
import OSM from 'ol/source/OSM.js';
import XYZ from 'ol/source/XYZ';


@Component({
  selector: 'app-map-chart',
  templateUrl: './map-chart.component.html',
  styleUrls: ['./map-chart.component.css']
})
export class MapChartComponent implements OnInit, AfterViewInit {
// export class MapChartComponent implements OnInit, AfterViewInit {

  height = 600;

  dataSub: Subscription;
  reports: Report[];

  featureData = [];


  map: OlMap;
  source: OlXYZ;
  layer: OlTileLayer;
  view: OlView;


  constructor(
    private _sparqlDataService: SparqlDataService,
    private _distributeDataService: DistributeDataService,
  ) { }

  ngAfterViewInit() {
    const osmLayer = new TileLayer({
      source: new OSM()
    });

    const xyzLayer = new TileLayer({
      source: new XYZ({
        url: 'http://tile.osm.org/{z}/{x}/{y}.png'
      })
    });
    this.view = new View({
      center: [-472202, 7530279],
      zoom: 12
    });

    this.map = new olMap({
      target: 'ol-map',
      layers: [
        osmLayer,
        // xyzLayer
      ],
      view: this.view
    });
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
