export interface AuthConfig {
  apiUrl: string;
  appOrigin: string;
  serviceToken?: string;
}

export function getAuthConfig(): AuthConfig {
  const apiUrl = process.env.SEAMLESS_AUTH_API_URL;
  const appOrigin = process.env.SEAMLESS_AUTH_APP_ORIGIN;
  const serviceToken = process.env.SEAMLESS_AUTH_API_SERVICE_TOKEN;

  if (!apiUrl) {
    throw new Error("SEAMLESS_AUTH_API_URL is required");
  }

  if (!appOrigin) {
    throw new Error("SEAMLESS_AUTH_APP_ORIGIN is required");
  }

  return {
    apiUrl,
    appOrigin,
    serviceToken,
  };
}
