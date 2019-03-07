import { Config, Contact, ContactTemplate, ContactUpdate, ServerError } from "@clinq/bridge";
import { Request } from "express";
import Hubspot from "hubspot";
import {
  anonymizeKey,
  convertToClinqContact,
  convertToHubspotContact,
  parseEnvironment
} from "./utils";

const { clientId, clientSecret, redirectUrl } = parseEnvironment();

export const createClient = async (apiKey: string) => {
  const [accessToken, refreshToken] = apiKey.split(":");

  if (refreshToken) {
    const client: any = new Hubspot({
      // TODO
      // Remove ts-ignore after https://github.com/MadKudu/node-hubspot/issues/159 has been resolved
      // @ts-ignore
      clientId,
      clientSecret,
      redirectUri: redirectUrl,
      refreshToken
    });

    await client.refreshAccessToken();

    return client;
  }

  return new Hubspot({ apiKey: accessToken });
};

export const getContacts = async ({ apiKey }: Config) => {
  const client = await createClient(apiKey);
  return getContactsPage(apiKey, client, 0, []);
};

export const createContact = async (
  { apiKey }: Config,
  contact: ContactTemplate
): Promise<Contact> => {
  const anonKey = anonymizeKey(apiKey);

  try {
    const client = await createClient(apiKey);
    const hubspotContact = await client.contacts.create(convertToHubspotContact(contact));
    const convertedContact: Contact = convertToClinqContact(hubspotContact);
    // tslint:disable-next-line:no-console
    console.log(`Created contact for ${anonKey}`);
    return convertedContact;
  } catch (error) {
    // tslint:disable-next-line:no-console
    console.error(`Could not create contact for key "${anonKey}: ${error.message}"`);
    throw new ServerError(400, "Could not create contact");
  }
};

export const updateContact = async (
  { apiKey }: Config,
  id: string,
  contact: ContactUpdate
): Promise<Contact> => {
  const anonKey = anonymizeKey(apiKey);

  try {
    const client = await createClient(apiKey);
    const hubspotContact = await client.contacts.update(id, convertToHubspotContact(contact));
    return convertToClinqContact(hubspotContact);
  } catch (error) {
    // tslint:disable-next-line:no-console
    console.error(`Could not update contact for key "${anonKey}: ${error.message}"`);
    throw new ServerError(400, "Could not update contact");
  }
};

export const deleteContact = async ({ apiKey }: Config, id: string) => {
  const anonKey = anonymizeKey(apiKey);

  try {
    const client = await createClient(apiKey);
    await client.contacts.delete(id);
  } catch (error) {
    // tslint:disable-next-line:no-console
    console.error(`Could not delete contact for key "${anonKey}: ${error.message}"`);
    throw new ServerError(404, "Could not delete contact");
  }
  // tslint:disable-next-line:no-console
  console.log(`Deleted contact for ${anonKey}`);
};

export const getOAuth2RedirectUrl = () => {
  return new Hubspot({
    // TODO
    // Remove ts-ignore after https://github.com/MadKudu/node-hubspot/issues/159 has been resolved
    // @ts-ignore
    clientId,
    clientSecret,
    redirectUri: redirectUrl
  }).oauth.getAuthorizationUrl({ scopes: "contacts" });
};

export const handleOAuth2Callback = async (req: Request): Promise<Config> => {
  const { code } = req.query;

  const tokens = await new Hubspot({
    // TODO
    // Remove ts-ignore after https://github.com/MadKudu/node-hubspot/issues/159 has been resolved
    // @ts-ignore
    clientId,
    clientSecret,
    redirectUri: redirectUrl
  }).oauth.getAccessToken({
    code
  });

  return {
    apiKey: `${tokens.access_token}:${tokens.refresh_token}`,
    apiUrl: ""
  };
};

const getContactsPage = async (
  apiKey: string,
  client: Hubspot,
  page: number,
  accumulated: Contact[]
): Promise<Contact[]> => {
  const anonKey = anonymizeKey(apiKey);
  const options = {
    count: 100,
    property: ["phone", "mobilephone", "firstname", "lastname", "email", "company"],
    vidOffset: page
  };
  const data = await client.contacts.get(options);

  const contacts = data.contacts.map(convertToClinqContact);
  const more = Boolean(data["has-more"]);
  let nextPage = Number(data["vid-offset"]);

  if (!nextPage) {
    nextPage++;
  }

  const mergedContacts = [...accumulated, ...contacts];

  // tslint:disable-next-line:no-console
  console.log(`Fetched ${mergedContacts.length} contacts for key ${anonKey}`);

  if (more) {
    return getContactsPage(apiKey, client, nextPage, mergedContacts);
  } else {
    return mergedContacts;
  }
};
