export default function StatusBadge({ value }) {
  const normalized = value || "UNKNOWN";

  const labels = {
    AVAILABLE: "Available",
    RESERVED: "Reserved",
    SOLD: "Sold",
    CANCELLED: "Cancelled",
  };

  return (
    <span className={`status-badge status-${normalized.toLowerCase()}`}>
      {labels[normalized] || normalized}
    </span>
  );
}