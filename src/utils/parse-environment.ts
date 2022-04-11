require("dotenv").config();

export interface OAuth2Options {
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
}

const {
  HUBSPOT_CLIENT_ID: clientId,
  HUBSPOT_CLIENT_SECRET: clientSecret,
  HUBSPOT_REDIRECT_URL: redirectUrl,
} = process.env;

export const parseEnvironment = (): OAuth2Options => {
  if (!clientId) {
    throw new Error("Missing HUBSPOT_CLIENT_ID in environment.");
  }

  if (!clientSecret) {
    throw new Error("Missing HUBSPOT_CLIENT_SECRET in environment.");
  }

  if (!redirectUrl) {
    throw new Error("Missing HUBSPOT_REDIRECT_URL in environment.");
  }

  return {
    clientId,
    clientSecret,
    redirectUrl,
  };
};
