import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Report } from './models/report.model';

@Injectable({
  providedIn: 'root'
})
export class DistributeDataService {

  private _dataSrc = new BehaviorSubject([]);
  currentData = this._dataSrc.asObservable();
  from: string | Date;
  to: string | Date;

  constructor() { }

  updateData(data: Report[], from: string | Date, to: string | Date): void {
    this._dataSrc.next(data);
    this.from = from;
    this.to = to;
  }

  getFrom(): string | Date {
    return this.from;
  }

  getTo(): string | Date {
    return this.to;
  }
}
