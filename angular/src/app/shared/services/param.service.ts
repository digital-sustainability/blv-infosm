import { Injectable } from '@angular/core';
import { ParamState } from '../models/param-state.model';
import { Router, ActivatedRoute } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class ParamService {


  constructor(
    private _router: Router,
    private _route: ActivatedRoute,
  ) { }

  // update the route without having to reset all other route properties. all others stay untouched
  updateRouteParams(changes: { [s: string]: string; }, oldState: ParamState): ParamState {
    const state = oldState;
    for (const key in changes) {
      // update the paramstate if there have been any changes
      if (state.hasOwnProperty(key) && changes[key] !== state[key]) {
        state[key] = changes[key];
      }
    }
    // set the params in the router
    this._router.navigate(
      [], {
        queryParams: state,
        relativeTo: this._route // stay on current route
      });
      return state;
  }

  // TODO: Method that checks for valid inputs
}
