import React from "react";
import { T } from "../../constants/theme";
import { PERIOD_OPTIONS } from "../../utils/periodUtils";
import Input from "./Input";

export default function PeriodFilter({
  period,
  setPeriod,
  selectedDate,
  setSelectedDate,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: T.muted }}>
        Period:
      </span>
      {PERIOD_OPTIONS.map(([key, label]) => (
        <button
          key={key}
          onClick={() => setPeriod(key)}
          style={{
            padding: "5px 11px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            border: `1px solid ${period === key ? T.accent : T.border}`,
            background: period === key ? T.accent : "transparent",
            color: period === key ? "#fff" : T.text,
          }}
        >
          {label}
        </button>
      ))}
      {period === "daily" && (
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{ width: 140, padding: "4px 8px", fontSize: 12 }}
        />
      )}
      {period === "monthly" && (
        <Input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{ width: 150, padding: "4px 8px", fontSize: 12 }}
        />
      )}
      {period === "yearly" && (
        <Input
          type="number"
          min="2000"
          max="2100"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          style={{ width: 88, padding: "4px 8px", fontSize: 12 }}
        />
      )}
    </div>
  );
}
