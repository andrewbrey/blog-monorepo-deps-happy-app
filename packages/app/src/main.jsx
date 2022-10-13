// In this application, I _had_ to do any react 17/18 migrations
// because now the whole repo on has only one react version!

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
