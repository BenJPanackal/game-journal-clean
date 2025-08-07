// 1) Figma globals (runs through PostCSS + Tailwind)
import "./styles/globals.css";
// 2) Tailwind itself (Vite plugin picks this up)
import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
