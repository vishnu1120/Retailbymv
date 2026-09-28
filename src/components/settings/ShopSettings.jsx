import React, { useState } from "react";
import { T } from "../../constants/theme";
import Btn from "../common/Btn";
import Card from "../common/Card";
import Field from "../common/Field";
import Input from "../common/Input";
import NumInput from "../common/NumInput";

export function ShopSettings({
  shopConfig,
  setShopConfig,
  onCloudSync,
  onCloudRestore,
}) {
  const [form, setForm] = useState(shopConfig);
  const [syncLoading, setSyncLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 600 }}>
      <div style={{ fontWeight: 700, fontSize: 18 }}>Shop Settings</div>
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Shop / Business Name">
            <Input
              value={form.shopName}
              onChange={(e) =>
                setForm((f) => ({ ...f, shopName: e.target.value }))
              }
              placeholder="Your Shop Name"
            />
          </Field>
          <Field label="Address">
            <Input
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
              placeholder="Shop address"
            />
          </Field>
          <Field label="Phone">
            <Input
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
              placeholder="Contact number"
            />
          </Field>
          <Field label="GSTIN">
            <Input
              value={form.gstNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, gstNumber: e.target.value }))
              }
              placeholder="e.g. 33AABCD1234E1Z5"
            />
          </Field>
          <Field label="FSSAI Licence No">
            <Input
              value={form.fssai || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, fssai: e.target.value }))
              }
              placeholder="e.g. 12415003000096"
            />
          </Field>
          <Field label="State">
            <Input
              value={form.state}
              onChange={(e) =>
                setForm((f) => ({ ...f, state: e.target.value }))
              }
              placeholder="e.g. Tamil Nadu"
            />
          </Field>
          <div
            style={{
              borderTop: `1px solid ${T.border}`,
              paddingTop: 12,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <div
              style={{ gridColumn: "1/-1", fontWeight: 700, fontSize: 13 }}
            >
              Customer Points
            </div>
            <Field label="Spend Amount">
              <NumInput
                value={String(form.pointsSpend ?? 100)}
                onChange={(v) =>
                  setForm((f) => ({ ...f, pointsSpend: v }))
                }
                placeholder="100"
              />
            </Field>
            <Field label="Points Given">
              <NumInput
                value={String(form.pointsEarn ?? 1)}
                onChange={(v) =>
                  setForm((f) => ({ ...f, pointsEarn: v }))
                }
                placeholder="1"
              />
            </Field>
            <Field label="Gift At Points">
              <NumInput
                value={String(form.pointsGiftAt ?? 500)}
                onChange={(v) =>
                  setForm((f) => ({ ...f, pointsGiftAt: v }))
                }
                placeholder="500"
              />
            </Field>
            <Field label="Gift Name">
              <Input
                value={form.pointsGiftName || "Gift"}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pointsGiftName: e.target.value }))
                }
                placeholder="Gift"
              />
            </Field>
          </div>
          <Btn
            onClick={() => {
              setShopConfig(form);
              alert("✅ Saved!");
            }}
            style={{ alignSelf: "flex-start" }}
          >
            💾 Save Settings
          </Btn>
        </div>
      </Card>

      {/* Dedicated Cloud Data Recovery & Backup Section */}
      <div style={{ fontWeight: 700, fontSize: 16, marginTop: 10 }}>
        ☁️ Cloud Data Recovery & Backup
      </div>
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>
            Your data is stored locally on this device as primary storage and is automatically synced to Supabase Cloud in the background. If you need to recover data from another device or force a manual snapshot, use the options below.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
            <Btn
              variant="outline"
              disabled={restoreLoading}
              onClick={async () => {
                if (onCloudRestore) {
                  setRestoreLoading(true);
                  await onCloudRestore();
                  setRestoreLoading(false);
                }
              }}
            >
              {restoreLoading ? "🔄 Restoring..." : "🔄 Restore from Cloud"}
            </Btn>
            <Btn
              variant="subtle"
              disabled={syncLoading}
              onClick={async () => {
                if (onCloudSync) {
                  setSyncLoading(true);
                  await onCloudSync();
                  setSyncLoading(false);
                }
              }}
            >
              {syncLoading ? "☁️ Syncing..." : "☁️ Manual Cloud Snapshot"}
            </Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default ShopSettings;
