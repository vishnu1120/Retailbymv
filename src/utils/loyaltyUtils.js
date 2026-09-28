import { clean, lower, n } from "./formatters";

export const getPointsRule = (shopConfig = {}) => ({
  enabled: shopConfig.pointsEnabled !== false,
  spend: Math.max(1, n(shopConfig.pointsSpend || 100)),
  points: Math.max(1, Math.floor(n(shopConfig.pointsEarn || 1))),
  giftAt: Math.max(1, Math.floor(n(shopConfig.pointsGiftAt || 500))),
  giftName: clean(shopConfig.pointsGiftName) || "Gift",
});

export const customerKey = (customer, phone) => lower(phone) || lower(customer);

export const isRealCustomer = (customer, phone) =>
  !!customerKey(customer, phone) && lower(customer) !== "walk-in";

export const calcPointsForAmount = (amount, rule) =>
  rule.enabled ? Math.floor(n(amount) / rule.spend) * rule.points : 0;
