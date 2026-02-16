import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { useEffect, useState } from "react";
import App from "./App";
import { setupAxiosInterceptors } from "./lib/axiosClient";
import store from "./store";
import "./index.css";

setupAxiosInterceptors(store);

function Root() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <BrowserRouter>
      <Provider store={store}>
        <App dark={dark} onToggleTheme={() => setDark((prev) => !prev)} />
      </Provider>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("app")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
