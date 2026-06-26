import React from "react";
import { createRoot } from "react-dom/client";
import HostIncome from "./HostIncome.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HostIncome />
  </React.StrictMode>
);
