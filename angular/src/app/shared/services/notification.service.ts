import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor(
    public toastr: ToastrService
  ) { }

  errorMessage(message: string, title: string) {
    this.toastr.error(message, title);
  }

  infoMessage(message: string, title: string) {
    this.toastr.info(message, title);
  }

}
