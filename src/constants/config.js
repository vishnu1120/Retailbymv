export const MS_DAY = 1000 * 60 * 60 * 24;
export const EXPIRY_ALERT_DAYS = 30;
export const BILLING_PRODUCT_LIMIT = 60;
export const LARGE_TABLE_LIMIT = 250;

export const NAV = [
  { id: "dashboard",    label: "Dashboard",           icon: "📊" },
  { id: "billing",      label: "Billing / POS ",      icon: "⚡" },
  { id: "stock",        label: "Stock ",              icon: "📦" },
  { id: "arrivals",     label: "Stock Arrival",      icon: "🚚" },
  { id: "distributors", label: "Distributors",        icon: "🏢" },
  { id: "sales",        label: "Sales & Customers",   icon: "📜" },
  { id: "monthly",      label: "Profit & Loss Report", icon: "📈" },
  { id: "tablecash",    label: "Table Cash",          icon: "💵" },
  { id: "expenses",     label: "Expenses & Bills",            icon: "💸" },
  { id: "accounting",   label: "Accounting",          icon: "💼" },
  { id: "settings",     label: "Shop Settings",       icon: "⚙️" },
  { id: "users",        label: "User Accounts",       icon: "👥" },
];

export const ADMIN_PIN = "1234";
export const APP_NAME = "WERP";
export const SESSION_HOURS = 8;
export const MAX_ATTEMPTS = 5;
export const LOCKOUT_MINS = 5;

export const USERS = [
  { id: "admin",   name: "Admin", role: "Admin",   pin: "1234", avatar: "👤" },
  //{ id: "cashier", name: "Cashier", role: "Cashier", pin: "0000", avatar: "👤" },
];

export const DEFAULT_SHOP = {
  shopName: "My Retail Shop",
  address: "",
  phone: "",
  gstNumber: "",
  footer: "Thank you for shopping with us!"
};
