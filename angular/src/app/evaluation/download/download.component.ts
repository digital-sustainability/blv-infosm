import { Component, OnInit, OnDestroy } from '@angular/core';
import { DistributeDataService } from 'src/app/shared/distribute-data.service';
import { Report } from '../../shared/models/report.model';
import { Translations } from '../../shared/models/translations.model';
import { Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { ngxCsv } from 'ngx-csv/ngx-csv';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-download',
  templateUrl: './download.component.html',
  styleUrls: ['./download.component.css']
})
export class DownloadComponent implements OnInit, OnDestroy {
  private _dataSub: Subscription;
  private translationSub: Subscription;
  private _reports: Report[];
  private _trans: Translations;

  constructor(
    public translate: TranslateService,
    private _distributeDataService: DistributeDataService,
  ) { }

  // TODO: Error handling and notify the user
  ngOnInit(): void {
    this._dataSub = this._distributeDataService.currentData.subscribe(
      reports => {
        this._reports = reports;
        this.translationSub = this.translate.get([
          'DOWNLOAD.TITLE',
          'DOWNLOAD.DIAGNOSIS_DATE',
          'DOWNLOAD.MUNICIPALITY',
          'DOWNLOAD.CANTON',
          'DOWNLOAD.PEST',
          'DOWNLOAD.PEST_GROUP',
          'DOWNLOAD.ANIMAL_GROUP',
          'DOWNLOAD.ANIMAL_SPECIES',
        ]).subscribe(
          texts => this._trans = texts,
          err => console.log(err)
        );
      },
      err => console.log(err)
    );
  }

  ngOnDestroy(): void {
    this._dataSub.unsubscribe();
    this.translationSub.unsubscribe();
  }

  onDownloadCsv(): void {
    if (this._reports && this._trans) {
      this.downlaodCsv(
        this._reports,
        this._distributeDataService.getFrom(),
        this._distributeDataService.getTo(),
        this._trans);
    }
  }

  onDownloadXlsx(): void {
    const header = this.createHeader(this._trans);
    if (this._reports && this._trans && header.length > 6) {
      this.downloadXlsx(
        this._reports,
        this._distributeDataService.getFrom(),
        this._distributeDataService.getTo(),
        this._trans,
        header);
    }
  }

  private downlaodCsv(data: Report[], from: string | Date, to: string | Date, trans: Translations): void {
    const filename = `${trans['DOWNLOAD.TITLE']} ${from} ${to}`;
    const options = {
      fieldSeparator: ',',
      quoteStrings: '"',
      showLabels: true,
      headers: this.createHeader(trans)
    };
    new ngxCsv(data, filename, options);
  }

  private downloadXlsx(data: Report[], from: string | Date, to: string | Date, trans: Translations, header: string[]): void {
    // create i18n header. Keys are the respective columns of the worksheet
    const xlsxHeader = [{
      A: header[0],
      B: header[1],
      C: header[2],
      D: header[3],
      E: header[4],
      F: header[5],
      G: header[6],
      H: header[7]
    }];
    const wb = XLSX.utils.book_new();
    // write reports to new worksheet. Header from keys are set as first row
    const ws = XLSX.utils.json_to_sheet(data);
    // overwrite the header row with i18n header
    XLSX.utils.sheet_add_json(ws, xlsxHeader, { skipHeader: true });
    // generate workbook and add the worksheet
    XLSX.utils.book_append_sheet(wb, ws, 'InfoSM');
    // download the workbook
    XLSX.writeFile(wb, `${trans['DOWNLOAD.TITLE']}_${from}_${to}.xlsx`);
  }

  private createHeader(trans: Translations): string[] {
    return [
      trans['DOWNLOAD.DIAGNOSIS_DATE'],
      trans['DOWNLOAD.MUNICIPALITY'],
      trans['DOWNLOAD.CANTON'],
      trans['DOWNLOAD.PEST'],
      trans['DOWNLOAD.PEST_GROUP'],
      trans['DOWNLOAD.ANIMAL_GROUP'],
      trans['DOWNLOAD.ANIMAL_SPECIES'],
    ];
  }

}
