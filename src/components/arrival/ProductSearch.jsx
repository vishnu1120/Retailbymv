import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { T } from "../../constants/theme";
import { lower, matchProductSearch } from "../../utils/formatters";

export const ProductSearch = React.forwardRef(
  ({ products, value, onChange, onKeyDown }, fwdRef) => {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState(null);
    const boxRef = useRef(null);
    const listRef = useRef(null);

    const selected = products.find((p) => String(p.id) === String(value));
    const display = open ? query : selected?.name || "";

    const filtered = useMemo(() => {
      if (!open) return [];
      const q = query;
      const matched = products.filter((p) => matchProductSearch(p, q));

      const uniqueMap = new Map();
      matched.forEach((p) => {
        const bc = clean(p.barcode);
        const normKey = bc ? `bc:${bc}` : `name:${lower(p.name)}|brand:${lower(p.brand || "")}`;
        if (!uniqueMap.has(normKey)) {
          uniqueMap.set(normKey, p);
        } else {
          const prev = uniqueMap.get(normKey);
          if (n(p.stock) > n(prev.stock)) {
            uniqueMap.set(normKey, p);
          }
        }
      });

      return Array.from(uniqueMap.values())
        .sort((a, b) => {
          const qClean = lower(q);
          if (qClean) {
            const aStartsWith = lower(a.name).startsWith(qClean);
            const bStartsWith = lower(b.name).startsWith(qClean);
            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;
          }
          return lower(a.name).localeCompare(lower(b.name));
        })
        .slice(0, 14);
    }, [products, query, open]);

    const isSelectingRef = useRef(false);

    const pick = (p) => {
      onChange(p.id);
      setQuery(p.name || "");
      setOpen(false);
    };

    useEffect(() => {
      const h = (e) => {
        if (
          boxRef.current &&
          !boxRef.current.contains(e.target) &&
          listRef.current &&
          !listRef.current.contains(e.target)
        )
          setOpen(false);
      };
      document.addEventListener("mousedown", h);
      return () => document.removeEventListener("mousedown", h);
    }, []);

    useEffect(() => {
      if (!open) return;
      const placeDropdown = () => {
        const rect = boxRef.current?.getBoundingClientRect();
        if (!rect) return;
        const gap = 4;
        const spaceBelow = window.innerHeight - rect.bottom - gap;
        const spaceAbove = rect.top - gap;
        const openAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
        const maxHeight = Math.max(
          140,
          Math.min(260, openAbove ? spaceAbove : spaceBelow)
        );

        setDropdownStyle({
          position: "fixed",
          left: rect.left,
          top: openAbove
            ? Math.max(gap, rect.top - maxHeight)
            : rect.bottom + gap,
          zIndex: 10000,
          background: T.card,
          border: `2px solid ${T.accent}`,
          borderRadius: "8px",
          width: Math.max(rect.width, 280),
          maxHeight,
          overflowY: "auto",
          boxShadow: "0 8px 24px rgba(0,0,0,.5)",
        });
      };

      placeDropdown();
      window.addEventListener("resize", placeDropdown);
      window.addEventListener("scroll", placeDropdown, true);
      return () => {
        window.removeEventListener("resize", placeDropdown);
        window.removeEventListener("scroll", placeDropdown, true);
      };
    }, [open, query, products.length]);

    return (
      <div ref={boxRef} style={{ position: "relative", width: "100%" }}>
        <input
          ref={fwdRef}
          className="sg-input"
          type="text"
          value={display}
          placeholder="Type name, brand or barcode…"
          onFocus={() => {
            if (!open) {
              setQuery(selected?.name || "");
              setOpen(true);
            }
          }}
          onBlur={() => {
            setTimeout(() => {
              if (!isSelectingRef.current) {
                setOpen(false);
              }
            }, 250);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              return;
            }

            if (e.key === "Enter") {
              e.preventDefault();
              if (filtered.length > 0) {
                pick(filtered[0]);
              }
              setOpen(false);
              if (onKeyDown) onKeyDown(e);
              return;
            }

            if (!open && onKeyDown) {
              onKeyDown(e);
            }
          }}
          style={{ width: "100%" }}
          autoComplete="off"
        />
        {open &&
          dropdownStyle &&
          createPortal(
            <div
              ref={listRef}
              style={dropdownStyle}
              onMouseEnter={() => { isSelectingRef.current = true; }}
              onMouseLeave={() => { isSelectingRef.current = false; }}
            >
              {filtered.length === 0 ? (
                <div
                  style={{ padding: "10px 14px", color: T.muted, fontSize: 12 }}
                >
                  No products found
                </div>
              ) : (
                filtered.map((p) => (
                  <div
                    key={p.id}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      pick(p);
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      pick(p);
                    }}
                    style={{
                      padding: "7px 12px",
                      cursor: "pointer",
                      borderBottom: `1px solid ${T.border}`,
                      background: p.id === value ? T.accentDim : "transparent",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = T.accentDim)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        p.id === value ? T.accentDim : "transparent")
                    }
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, color: T.text }}>
                      {p.name}
                    </div>
                    <div
                      style={{ fontSize: 11, color: T.muted, marginTop: 2 }}
                    >
                      {p.brand ? (
                        <span style={{ color: T.accent }}>{p.brand} · </span>
                      ) : (
                        ""
                      )}
                      {p.category}{" "}
                      {p.barcode ? (
                        <span style={{ fontFamily: "monospace" }}>
                          · {p.barcode}
                        </span>
                      ) : (
                        ""
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>,
            document.body
          )}
      </div>
    );
  }
);

export default ProductSearch;
