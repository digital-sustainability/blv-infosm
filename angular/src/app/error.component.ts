import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-error',
  template: `
  <div class="container-fluid fullheight">
    <h1>{{ 'ERROR.OCCURED' | translate }}</h1>
    <p>{{ 'ERROR.PAGE_NOT_FOUND' | translate }}</p>
    <p>{{ 'ERROR.YOUR_OPTIONS' | translate }}</p>
    <ul>
      <li><a [routerLink]="['']">{{ 'HEADER.HOME' | translate }}</a></li>
      <li><a [routerLink]="['/evaluation']">{{ 'HEADER.EVALUATION' | translate }}</a></li>
    </ul>
  </div>
  `,
  styles: [
    `.fullheight {
        height: 100vh;
      }
    `
  ]
})
export class ErrorComponent implements OnInit {

  constructor() { }

  ngOnInit() { }

}
