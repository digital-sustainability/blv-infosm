import { MatPaginatorIntl } from '@angular/material';
import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})

export class MatPaginatorI18nService extends MatPaginatorIntl {
    public constructor() {
        super();
    }
    
    // remove tooptip when user hovers over tooltip
    firstPageLabel: string = ''
    itemsPerPageLabel: string =''
    lastPageLabel: string = ''
    nextPageLabel: string = ''
    previousPageLabel: string = ''

    public getRangeLabel = (page: number, pageSize: number, length: number): string => {
        if (length === 0 || pageSize === 0) {
            return `0 / ${length}`;
        }

        length = Math.max(length, 0);

        const startIndex: number = page * pageSize;
        const endIndex: number = startIndex < length
            ? Math.min(startIndex + pageSize, length)
            : startIndex + pageSize;

        return `${startIndex + 1} - ${endIndex} / ${length}`;
    };

}

