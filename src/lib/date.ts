const EVENT_TIMEZONE = "Europe/Prague";

// "YYYY-MM-DD" for "today" in the event's timezone, independent of the
// server's own OS timezone configuration.
export function todayDateString(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: EVENT_TIMEZONE }).format(new Date());
}

export const DAILY_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const DUPLICATE_DAILY_DATE_ERROR = "Pro tento den už existuje jiný denní achievement.";
