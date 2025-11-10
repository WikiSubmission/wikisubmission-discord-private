// See utils/ folder for constructor class.

export type WScheduledTask = {
  id: string;
  description: string;
  interval:
    | "EVERY_FIVE_SECONDS"
    | "EVERY_MINUTE"
    | "EVERY_HOUR"
    | "EVERY_DAY"
    | "EVERY_OTHER_DAY"
    | "EVERY_WEEK";
  action: () => Promise<void>;
  triggerImmediately?: boolean;
};
