import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-geo-download-detail',
  templateUrl: './geo-download-detail.component.html',
  styleUrls: ['./geo-download-detail.component.css']
})
export class GeoDownloadDetailComponent implements OnInit {

  constructor(
    public translator: TranslateService,
  ) { }

  ngOnInit(): void {
  }

  onDownload() {

  }

  onCancel() {

  }

}
