import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-geo-download',
  templateUrl: './geo-download.component.html',
  styleUrls: ['./geo-download.component.css']
})
export class GeoDownloadComponent {

  constructor(
    public translator: TranslateService,
  ) { }

}
