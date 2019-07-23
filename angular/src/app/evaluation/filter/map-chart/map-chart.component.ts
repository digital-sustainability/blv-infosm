import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { SparqlDataService } from '../../../shared/services/sparql-data.service';
import { Report } from '../../../shared/models/report.model';
import { Frequency } from '../../../shared/models/frequency.model';
import { DistributeDataService } from 'src/app/shared/services/distribute-data.service';
import { NotificationService } from '../../../shared/services/notification.service';

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

import { Subscription, throwError } from 'rxjs';
import { isEqual, get, countBy, mapKeys } from 'lodash';


@Component({
  selector: 'app-map-chart',
  templateUrl: './map-chart.component.html',
  styleUrls: ['./map-chart.component.css']
})
export class MapChartComponent implements AfterViewInit, OnDestroy {

  height = 600;
  mapInitialized = false;

  dataSub: Subscription;
  wktCantonSub: Subscription;
  wktMunicSub: Subscription;

  reports: Report[];

  map: OlMap;
  source: OlXYZ;
  layer: OlTileLayer;
  view: OlView;
  opacity = 0.6; // of base shapes

  // base style for all shapes
  fill = new Fill();
  style = new Style({
    fill: this.fill,
    stroke: new Stroke({
      color: '#333',
      width: 1
    })
  });

  // style for the currently hovered shape
  selectStyle = new Style({
    fill: new Fill({
      // can't display selected shape with opacity, thus using the alpha value of RGBA
      color: 'rgba(0,0, 0, 0.1)'
    }),
    stroke: new Stroke({
      color: '#333',
      width: 2,
    }),
  });

  // select interaction working on "pointermove"
  hoverSelect = new Select({
    condition: pointerMove,
    style: this.selectStyle
  });

  clickSelect = new Select({
    condition: click,
  });

  // attribution for OSM layer
  attribution = new Attribution({
    collapsible: true
  });

  cantonVectorLayer: OlVectorLayer;
  municVectorLayer: OlVectorLayer;
  // shapes that are currently displayed to the user
  currentLayer: OlVectorLayer;

  // detailed values displayed on click and hover events
  area = '. . .';
  countPerShape: number;
  detailArea = '. . .';
  reportDetails: Frequency[];

  // function that is passed to each shape in the layer
  styleFn = (feature: Feature) => {
    this.fill.setColor(this.getColor(feature));
    return this.style;
  }

  constructor(
    private _sparqlDataService: SparqlDataService,
    private _distributeDataService: DistributeDataService,
    private _notification: NotificationService,
  ) { }

  ngAfterViewInit(): void {
    this.dataSub = this._distributeDataService.currentData.subscribe(
      (data: Report[]) => {
        // only proceed if data is emitted or data has changed (deep comparison)
        if (data.length && !isEqual(this.reports, data)) {
          this.reports = data;
          // unselect a selected shape if filter changes
          this.resetDetails();
          // only call when shapes are loaded or reports have changed
          if (this.cantonVectorLayer) {
            this.updateLayer(this.currentLayer);
          }
        }
        if (!this.mapInitialized) {
          this.initMap();
        }
        // only get canton shapes if none exist
        if (!this.wktCantonSub && !this.cantonVectorLayer && this.reports) {
          // load data for canton shapes and simultaniously load for municipalites
          this.wktCantonSub = this._sparqlDataService.getCantonWkts().subscribe(
            cantonWkts => {
              this.cantonVectorLayer = new OlVectorLayer({
                source: new Vector({
                  features: this.createShapes(cantonWkts, true)
                }),
                style: this.styleFn,
                opacity: this.opacity
              });
              // First time a layer is initialized it is set to `currentLayer`
              this.currentLayer = this.cantonVectorLayer;
              // Add cantons as initial layer
              this.map.addLayer(this.cantonVectorLayer);
              this.map.addInteraction(this.hoverSelect);
              this.map.addInteraction(this.clickSelect);
              this.hoverSelect.on('select', event => {
                if (event.selected.length > 0) {
                  const feature = event.selected[0];
                  const id = feature.getId();
                  this.area = feature.get('name');
                  // get report number of selected cantons/munics via array length
                  this.countPerShape = this.reports.filter(r => {
                    if (feature.get('isCanton')) {
                      return id === r.canton_id;
                    } else {
                      return id === r.munic_id;
                    }
                  }).length;
                }
              });
              this.clickSelect.on('select', event => {
                if (event.selected.length > 0) {
                  const feature = event.selected[0];
                  const id = feature.getId();
                  this.detailArea = feature.get('name');
                  this.reportDetails = this.getReportDetails(id, feature.get('isCanton'));
                } else {
                  this.resetDetails();
                }
              });
            },
            // TODO: Handle if no canton shapes received
            err =>  this._notification.errorMessage(err.statusText + '<br>' + 'no canton shapes', err.name)
          );
          }
          if (!this.wktMunicSub && !this.municVectorLayer && this.reports) {
            this.wktMunicSub = this._sparqlDataService.getMunicWkts().subscribe(
              municWkts => {
                this.municVectorLayer = new OlVectorLayer({
                  source: new Vector({
                    features: this.createShapes(municWkts, false)
                  }),
                  opacity: this.opacity
                });
              },
              // TODO: handle if no munic shapes come in
              err =>  this._notification.errorMessage(err.statusText + '<br>' + 'no munic shapes', err.name)
            );
          }
      }, // TODO: handle if no reports come in
      err =>  this._notification.errorMessage(err.statusText + '<br>' + 'data service error', err.name)
    );
  }

  ngOnDestroy(): void {
    this.dataSub.unsubscribe();
    this.wktCantonSub.unsubscribe();
    this.wktMunicSub.unsubscribe();
  }

  onSwitchLayer(layer: OlVectorLayer): void {
    this.resetDetails();
    this.map.removeLayer(this.currentLayer);
    this.currentLayer = layer;
    this.map.addLayer(this.currentLayer);
    this.updateLayer(this.currentLayer);
  }

  private getReportDetails(id: number, isCanton: boolean): Frequency[] {
    let reportDetails = [];
    // filter reports down to wanted canton/munic
    const selection = this.reports.filter(report => {
      if (isCanton) {
        return id === report.canton_id;
      } else {
        return id === report.munic_id;
      }
    });
    const count = countBy(selection.map(pest => get(pest, 'epidemic', 'not defined')));
    mapKeys(count, (value: string, key: number): void => {
      reportDetails = reportDetails.concat({
        name: key,
        count: value
      });
    });
    return reportDetails;
  }

  private updateLayer(layer: OlVectorLayer): void {
      if (this.reports && (this.cantonVectorLayer || this.municVectorLayer)) {
        layer.setStyle(this.styleFn);
      }
  }

  private initMap(): void {
    this.mapInitialized = true;
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
        'name': f.shape_label.value,
        'isCanton': isCanton,
      });
      if (!isCanton) {
        // Add parent canton as property
        feature.set('belongsToCanton', f.parent_canton_label.value);
      }
      return feature;
    });
  }

  private resetDetails(): void {
    this.detailArea = undefined;
    this.reportDetails = undefined;
    // remove the selet-style of the shape
    this.clickSelect.getFeatures().clear();
  }

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
    if (x === 0) {
      return 'white';
    } else
    if (x <= 5) {
      return 'rgb(210, 245, 60)';
    } else
    if (x <= 25) {
      return 'rgb(255, 255, 102)';
    } else
    if (x <= 50) {
      return 'rgb(255, 195, 0)';
    } else
    if (x <= 100) {
      return 'rgba(255, 87, 51, 0.6)';
    } else
    if (x <= 500) {
      return 'rgba(255, 0, 0, 1)';
    } else
    if (x <= 1000) {
      return 'rgba(199, 0, 57, 0.6)';
    } else {
      return 'rgb(88, 24, 69)';
    }
  }


}
