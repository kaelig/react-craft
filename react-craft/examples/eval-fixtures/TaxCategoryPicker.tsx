import React, { useState, useEffect } from "react";

// A realistic React component with intentional design system deviations
// for demonstrating the react-craft audit pipeline's detection capabilities.

interface TaxCategory {
  id: string;
  name: string;
  group: string;
  rate: number;
}

interface TaxCategoryPickerProps {
  onSelect: (category: TaxCategory) => void;
  countryCode: string;
}

export function TaxCategoryPicker({
  onSelect,
  countryCode,
}: TaxCategoryPickerProps) {
  const [categories, setCategories] = useState<TaxCategory[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/tax-categories?country=${countryCode}`)
      .then((res) => res.json())
      .then(setCategories);
  }, [countryCode]);

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grouped = filtered.reduce(
    (acc, cat) => {
      if (!acc[cat.group]) acc[cat.group] = [];
      acc[cat.group].push(cat);
      return acc;
    },
    {} as Record<string, TaxCategory[]>
  );

  const handleSelect = (cat: TaxCategory) => {
    setSelectedId(cat.id);
    setIsOpen(false);
    onSelect(cat);
  };

  return (
    <div style={{ position: "relative", width: "320px" }}>
      {/* Guardian: Custom dropdown where AcmeSelect exists */}
      {/* @ds-deviation reason="AcmeSelect doesn't support grouped options" ticket="DS-1234" */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: "8px 12px",
          border: "1px solid #ccc",
          borderRadius: "4px",
          cursor: "pointer",
          backgroundColor: "#ffffff",
          color: "#333333",
          fontSize: "14px",
          fontFamily: "Helvetica Neue, sans-serif",
        }}
      >
        {selectedId
          ? categories.find((c) => c.id === selectedId)?.name
          : "Select tax category..."}
        <span style={{ float: "right" }}>▾</span>
      </div>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            border: "1px solid #ccc",
            borderRadius: "4px",
            backgroundColor: "#fff",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            maxHeight: "300px",
            overflowY: "auto",
            zIndex: 1000,
          }}
        >
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "none",
              borderBottom: "1px solid #eee",
              fontSize: "14px",
              outline: "none",
            }}
          />

          {Object.entries(grouped).map(([group, cats]) => (
            <div key={group}>
              <div
                style={{
                  padding: "6px 12px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#666",
                  textTransform: "uppercase" as const,
                  backgroundColor: "#f5f5f5",
                }}
              >
                {group}
              </div>
              {cats.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => handleSelect(cat)}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    backgroundColor:
                      cat.id === selectedId ? "#e3f2fd" : "transparent",
                    color: "#333",
                  }}
                >
                  <span>{cat.name}</span>
                  <span
                    style={{
                      float: "right",
                      color: "#999",
                      fontSize: "12px",
                    }}
                  >
                    {cat.rate}%
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
