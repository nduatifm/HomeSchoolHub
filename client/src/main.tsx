import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import "./index.css";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

// GoogleOAuthProvider must be outside StrictMode — StrictMode double-invokes
// effects in development, causing google.accounts.id.initialize() to be called
// twice, which corrupts GIS state and breaks the sign-in popup.
createRoot(document.getElementById("root")!).render(
  googleClientId ? (
    <GoogleOAuthProvider clientId={googleClientId}>
      <StrictMode>
        <App />
      </StrictMode>
    </GoogleOAuthProvider>
  ) : (
    <StrictMode>
      <App />
    </StrictMode>
  )
);
