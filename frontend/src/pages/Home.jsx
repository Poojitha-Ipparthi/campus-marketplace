import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCategories, getListings } from "../api/listingsApi";

export default function Home() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [status, setStatus] = useState("AVAILABLE");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    loadCategories();
    loadListings();
  }, []);

  async function loadCategories() {
    try {
      const res = await getCategories();
      setCats(res.data);
    } catch {
      setError("Could not load categories");
    }
  }

  async function loadListings() {
    try {
      const params = {};

      if (search) params.search = search;
      if (category) params.category = category;
      if (condition) params.condition = condition;
      if (status) params.status = status;
      if (minPrice) params.min_price = minPrice;
      if (maxPrice) params.max_price = maxPrice;

      const res = await getListings(params);
      setItems(res.data);
    } catch {
      setError("Could not load listings");
    }
  }

  function clearFilters() {
    setSearch("");
    setCategory("");
    setCondition("");
    setStatus("AVAILABLE");
    setMinPrice("");
    setMaxPrice("");

    setTimeout(() => {
      loadListings();
    }, 0);
  }

  return (
    <div>
      <header className="header">
        <h1>Campus Marketplace</h1>
        <p>Browse, search, and filter ETSU listings</p>
      </header>

      <main className="container">
        {error && <p className="error">{error}</p>}

        <section className="filter-box">
          <h2>Find Listings</h2>

          <div className="filter-row">
            <input
              className="input"
              placeholder="Search listings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              className="input"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            >
              <option value="">Any Condition</option>
              <option value="NEW">New</option>
              <option value="USED">Used</option>
            </select>

            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Any Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="RESERVED">Reserved</option>
              <option value="SOLD">Sold</option>
            </select>
          </div>

          <div className="filter-row">
            <input
              className="input"
              placeholder="Min price"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />

            <input
              className="input"
              placeholder="Max price"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />

            <button className="button" onClick={loadListings}>
              Apply Filters
            </button>

            <button className="secondary-button" onClick={clearFilters}>
              Clear
            </button>
          </div>
        </section>

        <h2>Listings</h2>

        {items.length === 0 && <p>No listings found.</p>}

        <div className="grid">
          {items.map((x) => (
            <Link key={x.id} to={`/listings/${x.id}`} className="card-link">
              <div className="card">
                <div className="image">📦</div>

                <div className="title">{x.title}</div>

                <div className="desc">
                  {x.description || "No description"}
                </div>

                <div className="price">
                  {Number(x.price) === 0 ? "Free" : `$${x.price}`}
                </div>

                <div className="status">
                  {x.condition} · {x.status}
                </div>

                <div className="seller">
                  Seller: {x.seller_email || x.seller}
                </div>

                <div className="seller">
                  Trust Score: {x.seller_trust_score || "Not available"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}