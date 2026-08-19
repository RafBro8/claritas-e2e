// TARGET_ENV lets this suite run against either a local dev stack (default)
// or the live deployed app — set by claritas-e2e when it drives this suite
// with its "Live" environment selected. Unset/anything else means local.
const TARGET_ENV = process.env.TARGET_ENV === "live" ? "live" : "local";

export const FRONTEND_URL =
  TARGET_ENV === "live" ? "https://provisio-ten.vercel.app" : "http://localhost:5173";
export const BACKEND_URL =
  TARGET_ENV === "live" ? "https://provisio-api.onrender.com" : "http://localhost:4000";
export const API_URL = `${BACKEND_URL}/api`;

// A separate MongoDB database from the one used for everyday manual dev
// poking-around, so e2e runs never collide with or wipe local dev data.
export const E2E_MONGODB_URI = "mongodb://localhost:27017/provisio_e2e";

export const E2E_ADMIN_EMAIL = "e2e-admin@provisio.local";
export const E2E_ADMIN_PASSWORD = "e2e-admin-password";
export const E2E_ADMIN_NAME = "E2E Admin";
