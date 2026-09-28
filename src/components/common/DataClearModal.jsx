import React, { useState } from "react";
import { T } from "../../constants/theme";
import Modal from "./Modal";
import Field from "./Field";
import Input from "./Input";
import Btn from "./Btn";

export function DataClearModal({ onClose, onClear }) {
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  return (
    <Modal title="⚠️ Clear / Reset Data" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            background: T.redDim,
            border: `1px solid ${T.red}`,
            borderRadius: 8,
            padding: 14,
          }}
        >
          <div style={{ color: T.red, fontWeight: 700, marginBottom: 6 }}>
            Warning: Irreversible
          </div>
          <div style={{ fontSize: 13 }}>
            This permanently deletes selected data and cannot be undone.
          </div>
        </div>
        <Field label="Type DELETE to confirm full clear">
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Type DELETE"
          />
        </Field>
        {[
          { k: "all", l: "🗑️ Clear Everything", v: "danger" },
          { k: "sales", l: "Clear Sales Only", v: "secondary" },
          { k: "products", l: "Clear Products Only", v: "secondary" },
          { k: "expenses", l: "Clear Expenses Only", v: "secondary" },
        ].map((b) => (
          <Btn
            key={b.k}
            variant={b.v}
            onClick={() => {
              if (b.k === "all" && confirm !== "DELETE")
                return setError("Type DELETE first");
              setError("");
              onClear(b.k);
              onClose();
            }}
            style={{ width: "100%" }}
          >
            {b.l}
          </Btn>
        ))}
        {error && <div style={{ color: T.red, fontSize: 12, textAlign: "center" }}>{error}</div>}
        <Btn variant="ghost" onClick={onClose} style={{ width: "100%" }}>
          Cancel
        </Btn>
      </div>
    </Modal>
  );
}

export default DataClearModal;
