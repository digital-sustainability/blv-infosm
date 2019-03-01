import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Report } from '../models/report.model';
import * as moment from 'moment';

@Injectable()
export class SparqlDataService {

  private _api = environment.api;
  private _prefix = `BASE <https://blv.ld.admin.ch/animalpest/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX qb: <http://purl.org/linked-data/cube#>
PREFIX gont: <https://gont.ch/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>`;

  constructor(
    private http: HttpClient,
    ) { }

  getReports(lang: string, from: string | Date, to: string | Date): Observable<Report[]> {
    const query = `${this._prefix}
  SELECT *
  FROM <https://linked.opendata.swiss/graph/blv/animalpest> WHERE {
  ?sub a qb:Observation ;
    <http://ld.zazuko.com/animalpest/attribute/diagnose_datum> ?diagnose_datum;
    <http://ld.zazuko.com/animalpest/attribute/kanton_id>/rdfs:label ?kanton;
    <http://ld.zazuko.com/animalpest/attribute/gemeinde_id>/rdfs:label ?gemeinde;
		<http://ld.zazuko.com/animalpest/dimension/tier-art>/rdfs:label ?tierart;
    <http://ld.zazuko.com/animalpest/dimension/tier-seuche> ?seuchen_uri.
      ?seuchen_uri rdfs:label ?seuche;
      skos:broader/rdfs:label ?seuchen_gruppe.
  FILTER(langMatches(lang(?tierart), "${lang}"))
  FILTER(langMatches(lang(?seuche), "${lang}"))
  FILTER(langMatches(lang(?seuchen_gruppe), "${lang}"))
  FILTER (?diagnose_datum >= "${this.checkDate(from)}"^^xsd:date && ?diagnose_datum <="${this.checkDate(to)}"^^xsd:date)
}`;
    const params = new HttpParams().set('query', query);
    return this.http.get<Report[]>(this._api + 'getData', { params: params });
  }

  private checkDate(date: string | Date): string {
    return (moment(date).isValid()) ? moment(date).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');
  }
}
