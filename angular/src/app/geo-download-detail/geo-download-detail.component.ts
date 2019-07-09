import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { Angulartics2 } from 'angulartics2';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-geo-download-detail',
  templateUrl: './geo-download-detail.component.html',
  styleUrls: ['./geo-download-detail.component.css']
})
export class GeoDownloadDetailComponent {

  checked = false;
  hideWarning = true;
  private _api = environment.api;

  constructor(
    public translator: TranslateService,
    private _router: Router,
    private _angulartics2: Angulartics2
  ) { }

  onCheck(event: any): void {
    this.checked = event.target.checked;
  }

  onDownload(): void {
    if (this.checked) {
      window.location.href = this._api + 'geo-download';
      // Track download with Piwik
      this._angulartics2.eventTrack.next({
        action: 'download',
        properties: { category: 'Downloads' },
      });
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
