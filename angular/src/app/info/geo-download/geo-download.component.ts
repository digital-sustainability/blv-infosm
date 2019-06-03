import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-geo-download',
  templateUrl: './geo-download.component.html',
  styleUrls: ['./geo-download.component.css']
})
export class GeoDownloadComponent implements OnInit {

  constructor(
    public translator: TranslateService,
  ) { }

  ngOnInit(): void {
  }

}
