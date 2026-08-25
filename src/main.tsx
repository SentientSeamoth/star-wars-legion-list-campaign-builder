import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// HashRouter, not BrowserRouter: the app is a bundled Tauri webview with
// no server to handle path-based rewrites (a refresh/direct load of e.g.
// "/campaigns/abc" would 404 against the real filesystem otherwise).
// Hash routing needs no server cooperation. See docs/DECISIONS.md.
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
