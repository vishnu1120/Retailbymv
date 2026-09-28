import { today } from "./formatters";

export const PERIOD_OPTIONS = [
  ["all", "All Time"],
  ["daily", "Daily"],
  ["weekly", "Weekly (7d)"],
  ["monthly", "Monthly"],
  ["yearly", "Yearly"],
];

export const matchesPeriod = (value, period, selected = {}) => {
  if (!value || period === "all") return period === "all";

  const date = String(value).slice(0, 10);
  if (period === "daily") return date === (selected.date || today());
  if (period === "monthly") {
    return date.slice(0, 7) === (selected.month || today().slice(0, 7));
  }
  if (period === "yearly") {
    return date.slice(0, 4) === (selected.year || today().slice(0, 4));
  }
  if (period === "weekly") {
    const itemDate = new Date(`${date}T00:00:00`);
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);
    const days = Math.floor((endDate - itemDate) / 86400000);
    return days >= 0 && days < 7;
  }
  return true;
};
