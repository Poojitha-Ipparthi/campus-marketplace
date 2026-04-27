export default function SearchBar({ value, onChange, onSearch }) {
  function handleSubmit(e) {
    e.preventDefault();
    onSearch?.();
  }

  return (
    <form className="filter-row" onSubmit={handleSubmit}>
      <input
        className="input"
        type="text"
        placeholder="Search listings"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      <button className="button" type="submit">
        Search
      </button>
    </form>
  );
}