export const REALTIME_EVENTS = {
  orderCreated: 'order:created',
  orderUpdated: 'order:updated',
  menuChanged: 'menu:changed',
  settingsChanged: 'settings:changed',
} as const;

export type RealtimeEvent = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];
