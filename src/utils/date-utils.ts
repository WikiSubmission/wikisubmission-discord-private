import { formatDistance, add, sub } from "date-fns";

export class DateUtils {
  static distanceFromNow(targetDate: Date | number | string | null): string {
    if (!targetDate) return `now`;

    const target = new Date(targetDate);

    const now = new Date();

    const distance = formatDistance(target, now, { addSuffix: true });

    return distance || "--";
  }

  static getSpecificDate(
    value: number,
    metric: "minute" | "hour" | "day" | "week",
    direction: "future" | "past"
  ): Date {
    const now = new Date();
    let resultDate;

    if (direction === "future") {
      resultDate = add(now, { [`${metric}s`]: value });
    } else {
      resultDate = sub(now, { [`${metric}s`]: value });
    }

    return resultDate;
  }
}
