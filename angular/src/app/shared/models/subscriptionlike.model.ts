export interface SubscriptionLike {
  closed?: boolean;
  isStopped?: boolean;
  unsubscribe(): void;
}
