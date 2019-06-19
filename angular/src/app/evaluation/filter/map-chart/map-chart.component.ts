import { Component, AfterViewInit } from '@angular/core';
import { SparqlDataService } from '../../../shared/sparql-data.service';
import { Report } from '../../../shared/models/report.model';
import { Subscription } from 'rxjs';
import { DistributeDataService } from 'src/app/shared/distribute-data.service';

import { click, pointerMove } from 'ol/events/condition.js';
import { defaults as defaultControls, Attribution } from 'ol/control.js';
import { fromLonLat } from 'ol/proj';
import { transformExtent } from 'ol/proj';
import { Fill, Style, Stroke } from 'ol/style.js';

import OlMap from 'ol/Map';
import OlXYZ from 'ol/source/XYZ';
import OlTileLayer from 'ol/layer/Tile';
import OlVectorLayer from 'ol/layer/Vector';
import Select from 'ol/interaction/Select.js';
import OlView from 'ol/View';
import WKT from 'ol/format/WKT';
import olMap from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import View from 'ol/View';
import OSM from 'ol/source/OSM.js';
import Vector from 'ol/source/Vector';
import Feature from 'ol/Feature';

import { isEqual } from 'lodash';


@Component({
  selector: 'app-map-chart',
  templateUrl: './map-chart.component.html',
  styleUrls: ['./map-chart.component.css']
})
export class MapChartComponent implements AfterViewInit {

  // map height
  height = 600;
  initialized = false;

  dataSub: Subscription;
  reports: Report[];

  map: OlMap;
  source: OlXYZ;
  layer: OlTileLayer;
  view: OlView;
  // of base shapes
  opacity = 0.6;

  // base style for all shapes
  fill = new Fill();
  style = new Style({
    fill: this.fill,
    stroke: new Stroke({
      color: '#333',
      width: 1
    })
  });

  // style for the currently selected shape
  selectStyle = new Style({
    fill: new Fill({
      // can't display selected shape with opacity, thus using the alpha value of RGBA
      color: 'rgba(0,0, 0, 0.1)'
    }),
    stroke: new Stroke({
      color: '#333',
      width: 2,
    }),
  });3

  // select interaction working on "pointermove"
  select = new Select({
    condition: pointerMove,
    style: this.selectStyle
  });

  // attribution for OSM layer
  attribution = new Attribution({
    collapsible: true
  });

  cantonVectorLayer: OlVectorLayer;
  municVectorLayer: OlVectorLayer;
  // shapes that are currently displayed to the user
  currentLayer: OlVectorLayer;

  // temp
  area: string;
  countPerShape: number;

  // function that is passed to each shape in the layer
  styleFn = (feature: Feature) => {
    this.fill.setColor(this.getColor(feature));
    return this.style;
  }

  // TODO: Evt. set style and change it back on un-selections
  // selectStyleFn = (feature: Feature) => {
  //   this.fill.setColor(this.getColor(feature));
  //   return this.selectStyle;
  // }

  constructor(
    private _sparqlDataService: SparqlDataService,
    private _distributeDataService: DistributeDataService,
  ) { }

  ngAfterViewInit(): void {
    if (!this.initialized) {
      this.initMap();
    }
    this.dataSub = this._distributeDataService.currentData.subscribe(
      data => {
        // only proceed if data is emitted or data has changed (deep comparison)
        if (data.length && !isEqual(this.reports, data)) {
          this.reports = data;
          // only call when shapes are loaded or reports have changed
          if (this.cantonVectorLayer) {
            this.updateLayer(this.currentLayer);
          }

        }
        // only get canton shapes if none exist
        if (!this.cantonVectorLayer && !this.initialized) {
          this.initialized = true;
          // load data for canton shapes and simultaniously load for municipalites
          // ADM1 --> Cantons
          this._sparqlDataService.getWkt('ADM1').subscribe(
            // TODO: use RXJS pipe/map
            cantonWkts => {
              /**
               * TODO: Cache is too big to be kept in session-/loaclStorage. It can still be tried for the data loaded by the filter
               * but has to be implemented with an exeption handler in case the cache exeeds the browsers maxium. It might still be
               * helpful though, depends if the distribute service is sufficient in chaing for the whole filter
               *
               * MORE PERFORMANCE IDEAS:
               * - Cache the WKTs in one of the filters service, to minimize refetching
               // check if shapes have been loaded into sessions or if already loaded into component
              if (!sessionStorage.getItem('canton')) {
                console.log('I saved to storage: ', shapes);
                // Set a session cache. Stringify because the cache can only handle string key/value pairs
                sessionStorage.setItem('canton', JSON.stringify(shapes));
              }
              */

              this.cantonVectorLayer = new OlVectorLayer({
                source: new Vector({
                  features: this.createShapes(cantonWkts, true)
                }),
                style: this.styleFn,
                opacity: this.opacity
              });
              // First time a layer is initialized it is set to `currentLayer`
              this.currentLayer = this.cantonVectorLayer;
              console.log('This function should only be called once');
              // Add cantons as initial layer
              this.map.addLayer(this.cantonVectorLayer);
              this.map.addInteraction(this.select);
              this.select.on('select', event => {
                if (event.selected.length > 0) {
                  const feature = event.selected[0];
                  const id = feature.getId();
                  this.area = feature.get('name');
                  this.countPerShape = this.reports.filter(r => {
                    if (feature.get('isCanton')) {
                      return id === r.canton_id;
                    } else {
                      return id === r.munic_id;
                    }
                  }).length;
                  console.log(this.countPerShape);
                }
              });
            },
            // TODO: Handle if no canton shapes received
            err => console.log(err)
          );
          }

          // only get munic shapes if none exist
          if (!this.municVectorLayer) {
            // ADM3 --> Municipalities
            this._sparqlDataService.getWkt('ADM3').subscribe(
              municWkts => {
                this.municVectorLayer = new OlVectorLayer({
                  source: new Vector({
                    features: this.createShapes(municWkts, false)
                  }),
                  opacity: this.opacity
                });
              },
              // TODO: handle if no munic shapes come in
              err => console.log(err)
            );
          }




      }, // TODO: handle if no reports come in
      err => console.log(err)
    );

  }

  onSwitchLayer(layer: OlVectorLayer): void {
    this.map.removeLayer(this.currentLayer);
    this.currentLayer = layer;
    this.map.addLayer(this.currentLayer);
    this.updateLayer(this.currentLayer);
  }

  private updateLayer(layer: OlVectorLayer): void {
      if (this.reports && (this.cantonVectorLayer || this.municVectorLayer)) {
        layer.setStyle(this.styleFn);
      }
  }

  private initMap() {
    const osmLayer = new TileLayer({
      source: new OSM()
    });
    // limit where the user can pan [minx, miny, maxx, maxy]
    const maxExtent = transformExtent([5.888672, 45.644768, 11.030273, 47.975214], 'EPSG:4326', 'EPSG:3857');

    this.view = new View({
      // OL default projection Web Mercator (EPSG:3857). gather coordinat information from https://epsg.io/
      center: fromLonLat([8.349609, 46.867703]),
      zoom: 7.5,
      minZoom: 7,
      extent: maxExtent
    });

    this.map = new olMap({
      target: 'ol-map',
      layers: [osmLayer], // TODO: Get swisstopo style layer
      view: this.view,
      controls: defaultControls({ attribution: false }).extend([this.attribution])
    });

  }


  // transform format to WKT and in the right projection
  private createShapes(features: Feature[], isCanton: boolean): Vector[] {
    const format = new WKT();
    return features.map(f => {
      const feature = format.readFeature(f.wkt.value);
      feature.getGeometry().transform('EPSG:4326', 'EPSG:3857');
      feature.setId(Number(f.shape_id.value));
      feature.setProperties({
        'name': f.shape_id.value, // TODO: Replace by actual name
        'isCanton': isCanton,
      });
      // TODO: If munic, add a belongs to value
      // feature.set('belongsTo', cantonId); e
      // feature.get('name'); // Get the set values
      return feature;
    });
  }

  // private getRelativeColor(percent: number): any {
  //   return `hsl(0, 59%, ${(percent).toFixed()}%)`;
  // }

  // calculate the color that the shape is supposed to have based on animal diseases per area
  private getColor(feature: Feature): string {
    const id = feature.getId();
    const cases = this.reports.filter(r => {
      if (feature.get('isCanton')) {
        return id === r.canton_id;
      } else {
        return id === r.munic_id;
      }
    });
    const x = cases.length;
    if (x === 0) return 'white';
    if (x <= 5) return 'rgb(210, 245, 60)';
    if (x <= 25) return 'rgb(255, 255, 102)';
    if (x <= 50) return 'rgb(255, 195, 0)';
    if (x <= 100) return 'rgb(255, 87, 51, 0.6)';
    if (x <= 500) return 'rgb(255, 0, 0, 1)';
    if (x <= 1000) return 'rgb(199, 0, 57, 0.6)';
    else return 'rgb(88, 24, 69)';
  }


}
