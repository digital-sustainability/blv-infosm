import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-home',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.css']
})
export class InfoComponent {

  constructor(
    public translator: TranslateService,
  ) { }

  onScrollUp(): void {
    window.scrollTo(0, 0);
  }

}
