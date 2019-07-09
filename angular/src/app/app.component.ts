import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Angulartics2Piwik } from 'angulartics2/piwik/';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  title = 'InfoSM';

  constructor(
    public translate: TranslateService,
    private _angulartics2Piwik: Angulartics2Piwik
  ) {
    translate.addLangs(['de', 'fr', 'it', 'en']);
  }

  ngOnInit() {
    this._angulartics2Piwik.startTracking();
  }

}
