import { Injectable } from '@angular/core';
import { SubscriptionLike } from '../models/subscriptionlike.model';

/**
 * SubscriptionManagerService holds RxJS subscriptions and unsubscribes them all once component is destroyed
 * Implementation based on https://github.com/wardbell/subsink
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionManagerService {

  protected _subs: SubscriptionLike[] = [];

  constructor() { }

  add(...subscriptions: SubscriptionLike[]): void {
    // Remove completed Subscriptions
    if (this._subs.length > 40) {
      this.flushCompletedSubs();
    }
    this._subs = this._subs.concat(subscriptions);
  }

  unsubscribe(): void {
    this._subs.forEach(sub => sub && this.isFunction(sub.unsubscribe) && sub.unsubscribe());
    this._subs = [];
  }

  private isFunction(fn: any): boolean {
    return typeof fn === 'function';
  }

  private flushCompletedSubs(): void {
    // Unsubscribe from all completed ones just in case.
    this._subs.forEach(sub => {
      if (this.isFunction(sub.unsubscribe) && sub.closed && sub.isStopped) {
        sub.unsubscribe();
      }
    });
    // Remove unsubscribed subs
    this._subs = this._subs.filter(
      sub => this.isFunction(sub.unsubscribe) && (!sub.closed || !sub.isStopped)
    );
  }
}
