import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { start } from 'repl';

@Component({
  selector: 'app-geo-download-detail',
  templateUrl: './geo-download-detail.component.html',
  styleUrls: ['./geo-download-detail.component.css']
})
export class GeoDownloadDetailComponent implements OnInit {

  checked = false;
  hideWarning = true;

  constructor(
    public translator: TranslateService,
    private _router: Router
  ) { }

  ngOnInit(): void { }

  onCheck(event): void {
    this.checked = event.target.checked;
  }

  onDownload() {
    if (this.checked) {
      console.log('Start download');
      this._router.navigate(['/info']);
    } else {
      this.hideWarning = false;
    }
  }

  onCancel() {
    this._router.navigate(['/info']);
  }

}
