"use client";
import { useId, useState } from "react";
import { Icon } from "./icon";
interface Option {
  name: string;
  count?: number;
}
export function SearchField({
  label,
  placeholder,
  value,
  options,
  onChange,
  heading,
}: {
  label: string;
  placeholder: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  heading?: string;
}) {
  const id = useId();
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const matches = options.filter((o) =>
    normalize(o.name).includes(normalize(query ?? value)),
  );
  function select(name: string) {
    onChange(name);
    setQuery(null);
    setOpen(false);
  }
  return (
    <div
      className="search-field"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setOpen(false);
          setQuery(null);
        }
      }}
    >
      <label className="field" htmlFor={id}>
        {label}
      </label>
      <div className="search-input">
        <Icon name="search" />
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={
            open && matches[active] ? `${id}-${active}` : undefined
          }
          autoComplete="off"
          placeholder={placeholder}
          value={query ?? value}
          onFocus={() => {
            setOpen(true);
            setActive(0);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setQuery(null);
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, matches.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            }
            if (e.key === "Enter" && open && matches[active]) {
              e.preventDefault();
              select(matches[active].name);
            }
          }}
        />
        {(value || query) && (
          <button
            type="button"
            aria-label={`Quitar ${label.toLowerCase()}`}
            className="clear-search"
            onClick={() => select("")}
          >
            <Icon name="close" />
          </button>
        )}
      </div>
      {open && (
        <div className="search-results">
          <p className="overline">
            {matches.length} {heading || "resultados"}
          </p>
          <ul role="listbox" id={`${id}-list`} aria-label={label}>
            {matches.map((o, i) => (
              <li
                id={`${id}-${i}`}
                key={o.name}
                role="option"
                aria-selected={i === active}
                onPointerMove={() => setActive(i)}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => select(o.name)}
                >
                  {o.name}
                  {o.count !== undefined && (
                    <span className="mono muted">{o.count} focos</span>
                  )}
                </button>
              </li>
            ))}
            {!matches.length && (
              <li className="no-matches">No se encontraron coincidencias.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
