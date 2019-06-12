import { Pipe, PipeTransform } from '@angular/core';

@Pipe({name: 'chDate'})
export class ChDate implements PipeTransform {
  transform(value: string | Date): string {
      if(value) {
        return value.toString().split("-").reverse().join(".");
      } else {
        // TODO: Find solution is no value
        return "";
      }
    
  }
}