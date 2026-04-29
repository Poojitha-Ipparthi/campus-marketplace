export default function CategoryFilter({
  categories = [],
  category,
  condition,
  minPrice,
  maxPrice,
  onCategoryChange,
  onConditionChange,
  onMinPriceChange,
  onMaxPriceChange,
  onApply,
  onClear,
}) {
  return (
    <section className="filter-box">
      <h2>Filters</h2>

      <div className="filter-row">
        <select
          className="input"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          className="input"
          value={condition}
          onChange={(e) => onConditionChange(e.target.value)}
        >
          <option value="">Any Condition</option>
          <option value="NEW">New</option>
          <option value="USED">Used</option>
        </select>
        <input
          className="input"
          type="number"
          min="0"
          placeholder="Min price"
          value={minPrice}
          onChange={(e) => onMinPriceChange(e.target.value)}
        />

        <input
          className="input"
          type="number"
          min="0"
          placeholder="Max price"
          value={maxPrice}
          onChange={(e) => onMaxPriceChange(e.target.value)}
        />

        <button className="button" type="button" onClick={onApply}>
          Apply
        </button>

        <button className="button" type="button" onClick={onClear}>
          Clear
        </button>
      </div>
    </section>
  );
}