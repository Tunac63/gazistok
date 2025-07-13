// src/components/SearchPanel.jsx

import React from "react";
import { FormControl, InputGroup } from "react-bootstrap";

const SearchPanel = ({ searchTerm, setSearchTerm, categories }) => (
  <>
    <FormControl
      as="select"
      className="mb-3"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    >
      <option value="">Tüm Kategoriler</option>
      {categories.map((cat, idx) => (
        <option key={idx} value={cat}>{cat}</option>
      ))}
    </FormControl>

    <InputGroup className="mb-3">
      <FormControl
        placeholder="Ürün adı yazın"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </InputGroup>
  </>
);

export default SearchPanel;