const configuredBackendUrl = import.meta.env.BACKEND_URL?.trim();

export const backendUrl = configuredBackendUrl || (
  import.meta.env.DEV ? "http://localhost:5000" : ""
);

if (!backendUrl) {
  throw new Error(
    "BACKEND_URL is required in production. Set it to the deployed API URL.",
  );
}
