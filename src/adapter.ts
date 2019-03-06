import { Config, Contact, ServerError } from "@clinq/bridge";
import { Request } from "express";
import Hubspot from "hubspot";
import {
  anonymizeKey,
  convertToClinqContact,
  convertToHubspotContact,
  parseEnvironment
} from "./utils";

interface Page {
  contacts: Contact[];
  more: boolean;
  nextPage: number;
}

const { clientId, clientSecret, redirectUrl } = parseEnvironment();

export const createClient = async apiKey => {
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

export const getContacts = async ({ apiKey }) => {
  const client = await createClient(apiKey);
  return getContactsPage(apiKey, client, 0, []);
};

export const createContact = async ({ apiKey }, contact) => {
  const anonKey = anonymizeKey(apiKey);

  try {
    const client = await createClient(apiKey);
    const hubspotContact = await client.contacts.create(
      convertToHubspotContact(contact)
    );
    contact = convertToClinqContact(hubspotContact);
  } catch (error) {
    // tslint:disable-next-line:no-console
    console.error(
      `Could not create contact for key "${anonKey}: ${error.message}"`
    );
    throw new ServerError(400, "Could not create contact");
  }

  // tslint:disable-next-line:no-console
  console.log(`Created contact for ${anonKey}`);

  return contact;
};

export const updateContact = async (
  { apiKey },
  id,
  contact
): Promise<Contact> => {
  const anonKey = anonymizeKey(apiKey);

  try {
    const client = await createClient(apiKey);
    await client.contacts.update(id, convertToHubspotContact(contact));
  } catch (error) {
    // tslint:disable-next-line:no-console
    console.error(
      `Could not update contact for key "${anonKey}: ${error.message}"`
    );
    throw new ServerError(400, "Could not update contact");
  }

  // tslint:disable-next-line:no-console
  console.log(`Updated contact for ${anonKey}`);
  return {
    avatarUrl: contact.avatarUrl || null,
    contactUrl: contact.contactUrl || null,
    email: contact.email || null,
    firstName: contact.firstName || null,
    id: contact.id || id,
    lastName: contact.lastName || null,
    name: contact.name || null,
    organization: contact.organization || null,
    phoneNumbers: contact.phoneNumbers
  };
};

export const deleteContact = async ({ apiKey }, id) => {
  const anonKey = anonymizeKey(apiKey);

  try {
    const client = await createClient(apiKey);
    await client.contacts.delete(id);
  } catch (error) {
    // tslint:disable-next-line:no-console
    console.error(
      `Could not delete contact for key "${anonKey}: ${error.message}"`
    );
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

const getContactsPage = async (apiKey, client, page, accumulated) => {
  const anonKey = anonymizeKey(apiKey);
  const options = {
    count: 100,
    property: [
      "phone",
      "mobilephone",
      "firstname",
      "lastname",
      "email",
      "company"
    ],
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
