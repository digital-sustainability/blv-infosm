import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Report } from './models/report.model';

@Injectable({
  providedIn: 'root'
})
export class DistributeDataService {

  private _dataSrc = new BehaviorSubject([]);
  currentData = this._dataSrc.asObservable();

  constructor() { }

  updateData(data: Report[]) {
    this._dataSrc.next(data);
  }
}
