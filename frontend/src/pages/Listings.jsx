import { useEffect, useState } from "react";
import { getCategories, getListings } from "../api/listingsApi";
import CategoryFilter from "../components/CategoryFilter";
import ListingCard from "../components/ListingCard";
import SearchBar from "../components/SearchBar";

export default function Listings() {
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);

    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [condition, setCondition] = useState("");
    const [status, setStatus] = useState("AVAILABLE");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadCategories();
        loadListings();
    }, []);

    async function loadCategories() {
        try {
            const res = await getCategories();
            setCategories(Array.isArray(res.data) ? res.data : []);
        } catch {
            setCategories([]);
        }
    }

    async function loadListings(customParams = null) {
        try {
            setLoading(true);
            setError("");

            const params = customParams ?? {};

            if (!customParams) {
                if (search) params.search = search;
                if (category) params.category = category;
                if (condition) params.condition = condition;
                if (status) params.status = status;
                if (minPrice) params.min_price = minPrice;
                if (maxPrice) params.max_price = maxPrice;
            }

            const res = await getListings(params);
            setItems(Array.isArray(res.data) ? res.data : []);
        } catch {
            setError("Could not load listings.");
        } finally {
            setLoading(false);
        }
    }

    function clearFilters() {
        setSearch("");
        setCategory("");
        setCondition("");
        setStatus("AVAILABLE");
        setMinPrice("");
        setMaxPrice("");

        loadListings({ status: "AVAILABLE" });
    }

    return (
        <main className="container">

            {error && <p className="error">{error}</p>}

            <SearchBar value={search} onChange={setSearch} onSearch={() => loadListings()} />
            <CategoryFilter
                categories={categories}
                category={category}
                condition={condition}
                status={status}
                minPrice={minPrice}
                maxPrice={maxPrice}
                onCategoryChange={setCategory}
                onConditionChange={setCondition}
                onStatusChange={setStatus}
                onMinPriceChange={setMinPrice}
                onMaxPriceChange={setMaxPrice}
                onApply={() => loadListings()} onClear={clearFilters}
            />

            {loading && <p>Loading listings...</p>}

            {!loading && items.length === 0 && <p>No listings found.</p>}

            <div className="grid">
                {items.map((item) => (
                    <ListingCard key={item.id} listing={item} />
                ))}
            </div>
        </main>
    );
}