import React from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "react-oidc-context";
import App from "./App.jsx";
import "./styles.css";

const cognitoIssuer =
  "https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_5DHDFRDR2";
const cognitoDomain =
  "https://ap-south-15dhdfrdr2.auth.ap-south-1.amazoncognito.com";

const cognitoAuthConfig = {
  authority: cognitoIssuer,
  client_id: "1ftke7p59j1fo4d3djptd8rph2",
  redirect_uri: "http://localhost:3000/",
  post_logout_redirect_uri: "http://localhost:3000/",
  response_type: "code",
  scope: "email openid phone",
  metadata: {
    issuer: cognitoIssuer,
    authorization_endpoint: `${cognitoDomain}/oauth2/authorize`,
    token_endpoint: `${cognitoDomain}/oauth2/token`,
    userinfo_endpoint: `${cognitoDomain}/oauth2/userInfo`,
    jwks_uri: `${cognitoIssuer}/.well-known/jwks.json`,
    end_session_endpoint: `${cognitoDomain}/logout`
  },
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
};

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
