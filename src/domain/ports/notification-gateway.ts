/**
 * INotificationGateway - Port for Web Push notifications
 * Domain layer abstraction. No infrastructure dependencies.
 * Manages PushSubscription and Web Push delivery.
 */

export interface NotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export interface INotificationGateway {
  /**
   * Push 通知の購読を申し込む
   * Invariant: iOS 17+ Safari PWA では requestPermission() が必須
   * @param subscriberId - 空でないとき、購読 JSON を `/api/subscribe` に POST してサーバへ永続化する
   * @returns PushSubscription オブジェクト（endpoint と鍵を含む）
   */
  subscribeToPushNotifications(subscriberId?: string): Promise<PushSubscription | null>;

  /**
   * 購読状態を確認
   * @returns 購読済みなら PushSubscription、未購読なら null
   */
  getSubscription(): Promise<PushSubscription | null>;

  /**
   * ローカル通知を表示（フォアグラウンド時）
   * Invariant: Web Notification API または in-app banner で表示
   */
  showLocalNotification(title: string, options?: NotificationOptions): Promise<void>;

  /**
   * Push 通知の許諾状態を取得
   * Invariant: granted / denied / default のいずれか
   */
  getPermissionStatus(): Promise<'granted' | 'denied' | 'default'>;

  /**
   * Storage persistence の状態を確認
   * Invariant: true なら 7日 eviction 回避、false なら警告表示推奨
   */
  isPersistentStorageGranted(): Promise<boolean>;

  /**
   * Persistent storage を要求（オンボーディング時）
   */
  requestPersistentStorage(): Promise<boolean>;
}
