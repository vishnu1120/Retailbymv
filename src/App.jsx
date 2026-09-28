import React from "react";
import AppShell from "./components/layout/AppShell";

const LOCAL_USER = {
  id: "local-user",
  authUserId: "local-user",
  shopId: "local-shop",
  email: "local@werp",
  name: "Admin",
  role: "shop_admin",
};

export default function App() {
  return <AppShell currentUser={LOCAL_USER} tenantContext={null} onLogout={() => {}} />;
}
