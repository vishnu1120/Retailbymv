import React from "react";
import { T } from "../../constants/theme";
import { fmt } from "../../utils/formatters";
import Badge from "../common/Badge";
import Card from "../common/Card";

export function RecForecast({ receivables, sales }) {
  const today_d = new Date();
  today_d.setHours(0, 0, 0, 0);

  const pending = receivables.filter(
    (r) => r.status !== "Received" && r.balance > 0
  );

  const dpd = (dueDateStr) => {
    if (!dueDateStr) return null;
    const d = new Date(dueDateStr);
    d.setHours(0, 0, 0, 0);
    return Math.floor((today_d - d) / 86400000);
  };

  const custStats = {};
  sales.forEach((s) => {
    const k = (s.customer || "").trim().toLowerCase();
    if (!k || k === "walk-in") return;
    if (!custStats[k]) custStats[k] = { name: s.customer, count: 0, total: 0 };
    custStats[k].count++;
    custStats[k].total += s.total || 0;
  });

  const reliability = (partyName) => {
    const k = (partyName || "").trim().toLowerCase();
    const st = custStats[k];
    if (!st) return null;
    const score = st.count >= 5 ? "high" : st.count >= 2 ? "medium" : "low";
    return { ...st, score };
  };

  const overdue = pending
    .filter((r) => dpd(r.dueDate) > 0)
    .sort((a, b) => dpd(b.dueDate) - dpd(a.dueDate));
  const dueToday = pending.filter((r) => dpd(r.dueDate) === 0);
  const upcoming = pending.filter((r) => dpd(r.dueDate) < 0);

  const monthGroups = {};
  upcoming.forEach((r) => {
    const mk = r.dueDate ? r.dueDate.slice(0, 7) : "No date";
    if (!monthGroups[mk]) monthGroups[mk] = [];
    monthGroups[mk].push(r);
  });
  const sortedMonths = Object.keys(monthGroups).sort();

  const totalOverdue = overdue.reduce((s, r) => s + r.balance, 0);
  const totalToday = dueToday.reduce((s, r) => s + r.balance, 0);
  const totalUpcoming = upcoming.reduce((s, r) => s + r.balance, 0);

  const ReliabilityPill = ({ party }) => {
    const rel = reliability(party);
    if (!rel) return <span style={{ fontSize: 10, color: T.muted }}>—</span>;
    const cfg = {
      high: { color: T.green, bg: T.greenDim, label: "High", icon: "★★★" },
      medium: { color: T.amber, bg: T.amberDim, label: "Medium", icon: "★★☆" },
      low: { color: T.muted, bg: T.subtle, label: "Low", icon: "★☆☆" },
    }[rel.score];
    return (
      <span
        title={`${rel.count} purchase${rel.count !== 1 ? "s" : ""}, ${fmt(
          rel.total
        )} total`}
        style={{
          background: cfg.bg,
          color: cfg.color,
          padding: "2px 7px",
          borderRadius: 99,
          fontSize: 10,
          fontWeight: 600,
          whiteSpace: "nowrap",
          cursor: "default",
        }}
      >
        {cfg.icon} {cfg.label}
      </span>
    );
  };

  const RecRow = ({ r }) => {
    const age = dpd(r.dueDate);
    const isOvd = age > 0;
    const ageLabel =
      age === null
        ? "—"
        : age === 0
        ? "Today"
        : age > 0
        ? `${age}d overdue`
        : `in ${-age}d`;
    const ageColor =
      age === null
        ? T.muted
        : age === 0
        ? T.amber
        : age > 0
        ? T.red
        : T.green;
    return (
      <tr>
        <td style={{ fontWeight: 600 }}>{r.party}</td>
        <td style={{ fontSize: 11, color: T.muted, maxWidth: 180 }}>
          {r.description || "—"}
        </td>
        <td className="mono" style={{ color: T.purple, fontWeight: 700 }}>
          {fmt(r.balance)}
        </td>
        <td style={{ fontSize: 11 }}>{r.dueDate || "—"}</td>
        <td>
          <span
            style={{
              color: ageColor,
              fontWeight: isOvd ? 700 : 400,
              fontSize: 12,
            }}
          >
            {ageLabel}
          </span>
        </td>
        <td>
          <ReliabilityPill party={r.party} />
        </td>
        <td>
          <Badge
            color={
              r.status === "Received"
                ? "green"
                : r.status === "Partial"
                ? "amber"
                : "red"
            }
          >
            {r.status}
          </Badge>
        </td>
      </tr>
    );
  };

  if (pending.length === 0)
    return (
      <div style={{ textAlign: "center", padding: 60, color: T.muted }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          No pending receivables
        </div>
        <div style={{ fontSize: 12, marginTop: 6 }}>
          All collections are up to date.
        </div>
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 12,
        }}
      >
        <div
          style={{
            background: T.redDim,
            border: `1px solid ${T.red}33`,
            borderRadius: 12,
            padding: "14px 18px",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: T.red,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".07em",
              marginBottom: 4,
            }}
          >
            Overdue
          </div>
          <div
            className="mono"
            style={{ fontSize: 22, fontWeight: 800, color: T.red }}
          >
            {fmt(totalOverdue)}
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
            {overdue.length} receivable{overdue.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div
          style={{
            background: T.amberDim,
            border: `1px solid ${T.amber}33`,
            borderRadius: 12,
            padding: "14px 18px",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: T.amber,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".07em",
              marginBottom: 4,
            }}
          >
            Due Today
          </div>
          <div
            className="mono"
            style={{ fontSize: 22, fontWeight: 800, color: T.amber }}
          >
            {fmt(totalToday)}
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
            {dueToday.length} receivable{dueToday.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div
          style={{
            background: T.accentDim,
            border: `1px solid ${T.accent}33`,
            borderRadius: 12,
            padding: "14px 18px",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: T.accent,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".07em",
              marginBottom: 4,
            }}
          >
            Upcoming
          </div>
          <div
            className="mono"
            style={{ fontSize: 22, fontWeight: 800, color: T.accent }}
          >
            {fmt(totalUpcoming)}
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
            {upcoming.length} receivable{upcoming.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {overdue.length > 0 && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: T.red }}>
              🔴 Overdue
            </span>
            <span style={{ fontSize: 11, color: T.muted }}>
              — collect immediately
            </span>
          </div>
          <Card
            style={{
              padding: 0,
              overflow: "hidden",
              border: `1px solid ${T.red}33`,
            }}
          >
            <table>
              <thead>
                <tr>
                  <th>Party</th>
                  <th>Description</th>
                  <th>Balance</th>
                  <th>Due Date</th>
                  <th>Age</th>
                  <th>Reliability</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {overdue.map((r) => (
                  <RecRow key={r.id} r={r} />
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {dueToday.length > 0 && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: T.amber }}>
              🟡 Due Today
            </span>
          </div>
          <Card
            style={{
              padding: 0,
              overflow: "hidden",
              border: `1px solid ${T.amber}33`,
            }}
          >
            <table>
              <thead>
                <tr>
                  <th>Party</th>
                  <th>Description</th>
                  <th>Balance</th>
                  <th>Due Date</th>
                  <th>Age</th>
                  <th>Reliability</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {dueToday.map((r) => (
                  <RecRow key={r.id} r={r} />
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {sortedMonths.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
            📅 Upcoming by Month
          </div>
          {sortedMonths.map((mk) => {
            const rows = monthGroups[mk];
            const label =
              mk === "No date"
                ? "No due date"
                : new Date(mk + "-02").toLocaleDateString("en-IN", {
                    month: "long",
                    year: "numeric",
                  });
            const mTotal = rows.reduce((s, r) => s + r.balance, 0);
            return (
              <div key={mk}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 12,
                      color: T.muted,
                      textTransform: "uppercase",
                      letterSpacing: ".06em",
                    }}
                  >
                    {label}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: T.purple,
                    }}
                  >
                    {fmt(mTotal)}
                  </span>
                </div>
                <Card style={{ padding: 0, overflow: "hidden" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Party</th>
                        <th>Description</th>
                        <th>Balance</th>
                        <th>Due Date</th>
                        <th>Due In</th>
                        <th>Reliability</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <RecRow key={r.id} r={r} />
                      ))}
                    </tbody>
                  </table>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RecForecast;
