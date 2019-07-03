import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-geo-download-detail',
  templateUrl: './geo-download-detail.component.html',
  styleUrls: ['./geo-download-detail.component.css']
})
export class GeoDownloadDetailComponent {

  checked = false;
  hideWarning = true;

  constructor(
    public translator: TranslateService,
    private _router: Router
  ) { }

  onCheck(event: any): void {
    this.checked = event.target.checked;
  }

  onDownload(): void {
    if (this.checked) {
      console.log('Start download');
      this._router.navigate(['/info']);
    } else {
      this.hideWarning = false;
    }
  }

  onCancel(): void {
    this._router.navigate(['/info']);
  }

  onScrollUp(): void {
    window.scrollTo(0, 0);
  }

}
