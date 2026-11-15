import { createRoot } from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import { ChainId, ThirdwebProvider } from "@thirdweb-dev/react";
import "./index.css";
import { StateContextProvider } from "./context";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";

// Sepolia testnet chain ID
const sepoliaChainId = 11155111; // Numeric chain ID for Sepolia




createRoot(document.getElementById("root")!).render(
  <ThirdwebProvider activeChain={sepoliaChainId} clientId={import.meta.env.VITE_THIRDWEB_CLIENT_ID}>
    <Router>
      <StateContextProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </StateContextProvider>
    </Router>
  </ThirdwebProvider>
);
