import React from "react";
import { SearchUI } from "../components/SearchUI";

export const DiscoverPage = () => {
  return (
    <div data-testid="page-discover">
      <header style={{ marginBottom: "28px" }}>
        <h1
          className="font-display"
          style={{ fontSize: "28px", color: "#FFFFFF", marginBottom: "8px" }}
        >
          Discover Music
        </h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "15px" }}>
          Search for songs and play them instantly.
        </p>
      </header>

      <SearchUI />
    </div>
  );
};
