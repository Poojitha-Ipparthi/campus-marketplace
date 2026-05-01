/**
 * Small colored badge for listing or order status.
 * Color reflects the status value (AVAILABLE, RESERVED, SOLD, etc.)
 */

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