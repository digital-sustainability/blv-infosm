import { Component, OnInit, AfterViewInit } from '@angular/core';
import { SparqlDataService } from '../../../shared/sparql-data.service';
import { Report } from '../../../shared/models/report.model';
import { Subscription } from 'rxjs';
import { DistributeDataService } from 'src/app/shared/distribute-data.service';


import OlMap from 'ol/Map';
import OlXYZ from 'ol/source/XYZ';
import OlTileLayer from 'ol/layer/Tile';
import OlVectorLayer from 'ol/layer/Vector';
import WKT from 'ol/format/WKT';
import OlView from 'ol/View';
import { fromLonLat, transform } from 'ol/proj';
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';

import olMap from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import View from 'ol/View';
import OSM from 'ol/source/OSM.js';
import XYZ from 'ol/source/XYZ';
import Vector from 'ol/source/Vector';


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

    proj4.defs('EPSG:21781',
      '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 ' +
      '+x_0=600000 +y_0=200000 +ellps=bessel ' +
      '+towgs84=660.077,13.551,369.344,2.484,1.783,2.939,5.66 +units=m +no_defs');
    register(proj4);
    const swissCoord = transform([8.2318, 46.7985], 'EPSG:3857', 'EPSG:21781');
    const xyzLayer = new TileLayer({
      source: new XYZ({
        url: 'http://tile.osm.org/{z}/{x}/{y}.png'
      })
    });
    const format = new WKT();
    const feature = format.readFeature('POLYGON((10.689697265625 -25.0927734375, 34.595947265625 ' +
      '-20.1708984375, 38.814697265625 -35.6396484375, 13.502197265625 ' +
      '-39.1552734375, 10.689697265625 -25.0927734375))');
    feature.getGeometry().transform('EPSG:4326', 'EPSG:3857');

    const vectorLayer = new OlVectorLayer({
      source: new Vector({
        features: [feature]
      })
    });


    this.view = new View({
      // center: swissCoord,
      center: [8.2318, 46.7985],
      zoom: 4
    });

    this.map = new olMap({
      target: 'ol-map',
      layers: [
        osmLayer,
        // xyzLayer
        // vectorLayer
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
    this._sparqlDataService.getCantonsWkt().subscribe(
      wkts => {
        const features = [];
        wkts.map(w => {
          features.push(
            {
              // id: w[0].wkt.value.length,
              // wkt: w[0].wkt.value,
              id: w.canton_id.value,
              wkt: w.wkt.value,
              canton: true
            }
          );
        });
        this.featureData = features;
        console.log(this.featureData);

        const format = new WKT();
        const feature = format.readFeature(features[18].wkt);
        feature.getGeometry().transform('EPSG:4326', 'EPSG:3857');

        const vectorLayer = new OlVectorLayer({
          source: new Vector({
            features: [feature]
          })
        });
        this.map.addLayer(vectorLayer);
      },
      err => console.log(err)
    );

    // this._sparqlDataService.getMunicForCanton(1).subscribe(
    //   wkts => {
    //     const features = [];
    //     wkts.map(w => {
    //       // TODO: add dynamic `belongsTo`
    //       features.push({
    //         id: w.munic_id.value,
    //         wkt: w.wkt.value,
    //         belongsTo: 1,
    //         canton: false
    //       });
    //     });
    //     this.featureData = features;
    //     console.log(wkts);

    //   },
    //   err => console.log(err)
    // );
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
