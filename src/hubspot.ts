import {
  CallDirection,
  CallEvent,
  Config,
  Contact,
  ContactTemplate,
  ContactUpdate
} from "@clinq/bridge";
import axios from "axios";
import Hubspot from "hubspot";
import {
  convertToClinqContact,
  convertToHubspotContact,
  infoLogger,
  normalizePhoneNumber,
  parseEnvironment,
  parsePhoneNumber
} from "./utils";

interface CallDispostion {
  id: string;
  label: string;
}

// https://developers.hubspot.com/docs/methods/engagements/get-call-dispositions
const CALL_DISPOSITION_HANGUP = "f240bbac-87c9-4f6e-bf70-924b57d47db7";

const { clientId, clientSecret, redirectUrl } = parseEnvironment();

export const createClient = async (apiKey: string) => {
  const [accessToken, refreshToken] = apiKey.split(":");

  if (refreshToken) {
    const client = new Hubspot({
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

export const getHubspotContacts = async (
  config: Config,
  page: number,
  accumulated: Contact[] = []
): Promise<Contact[]> => {
  const client = await createClient(config.apiKey);

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

  infoLogger(config, `Fetched ${mergedContacts.length} contacts`);

  if (more) {
    return getHubspotContacts(config, nextPage, mergedContacts);
  } else {
    return mergedContacts;
  }
};

export const createHubspotContact = async (
  { apiKey }: Config,
  contact: ContactTemplate
): Promise<Contact> => {
  const client = await createClient(apiKey);
  return client.contacts.create(convertToHubspotContact(contact));
};

export const updateHubspotContact = async (
  { apiKey }: Config,
  id: string,
  contact: ContactUpdate
): Promise<Contact> => {
  const client = await createClient(apiKey);
  await client.contacts.update(id, convertToHubspotContact(contact));
  return client.contacts.getById(id);
};

export const deleteHubspotContact = async ({ apiKey }: Config, id: string) => {
  const client = await createClient(apiKey);
  return client.contacts.delete(id);
};

export const createCallEvent = async (config: Config, event: CallEvent) => {
  const ownerId = await getOwnerId(config);

  const phoneNumber = event.direction === CallDirection.OUT ? event.to : event.from;

  const contact = await getContactByPhoneNumber(config, phoneNumber);

  const contactId = contact["canonical-vid"];

  infoLogger(config, `Adding engagement to contact ${contactId}`);

  return createCallEngagement(config, contactId, ownerId, event);
};

export const getHubspotOAuth2RedirectUrl = () => {
  return new Hubspot({
    // TODO
    // Remove ts-ignore after https://github.com/MadKudu/node-hubspot/issues/159 has been resolved
    // @ts-ignore
    clientId,
    clientSecret,
    redirectUri: redirectUrl
  }).oauth.getAuthorizationUrl({ scopes: "contacts" });
};

export const handleHubspotOAuth2Callback = async (code: string): Promise<Config> => {
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

const getOwnerId = async ({ apiKey }: Config) => {
  const client = await createClient(apiKey);
  const {
    data: { user: email }
  } = await axios.get<{ user: string }>(
    `https://api.hubapi.com/oauth/v1/access-tokens/${client.accessToken}`
  );

  const owners = await client.owners.get({ email });

  if (!owners.length || !owners[0].ownerId) {
    throw new Error(`Cannot find owner id for email ${email}`);
  }

  return owners[0].ownerId;
};

const getContactByPhoneNumber = async ({ apiKey }: Config, phoneNumber: string) => {
  const client = await createClient(apiKey);

  const parsedPhoneNumber = parsePhoneNumber(phoneNumber);
  const originalQuery = client.contacts.search(phoneNumber);
  const localizedQuery = client.contacts.search(parsedPhoneNumber.localized);
  const localizedQueryNormalized = client.contacts.search(
    normalizePhoneNumber(parsedPhoneNumber.localized)
  );
  const e164Query = client.contacts.search(parsedPhoneNumber.e164);
  const e164QueryNormalized = client.contacts.search(normalizePhoneNumber(parsedPhoneNumber.e164));

  const results = await Promise.all([
    originalQuery,
    localizedQuery,
    localizedQueryNormalized,
    e164Query,
    e164QueryNormalized
  ]);

  const result = results
    .map(({ contacts }) => contacts)
    .filter(contacts => Array.isArray(contacts) && contacts.length > 0)
    .find(Boolean);

  if (!result) {
    throw new Error(`Cannot find contact for phone number ${phoneNumber}`);
  }

  return result[0];
};

const createCallEngagement = async (
  config: Config,
  contactId: string,
  ownerId: string,
  { id: externalId, from: fromNumber, to: toNumber, end, start, start: timestamp }: CallEvent
) => {
  const client = await createClient(config.apiKey);
  const dispositions: CallDispostion[] = await client.engagements.getCallDispositions();
  const disposition = dispositions
    .filter(entry => entry.label === "Connected")
    .map(entry => entry.id)
    .find(Boolean);
  return client.engagements.create({
    associations: {
      contactIds: [contactId]
    },
    engagement: {
      active: true,
      ownerId,
      timestamp,
      type: "CALL"
    },
    metadata: {
      body: "",
      disposition: disposition ? disposition : CALL_DISPOSITION_HANGUP,
      durationMilliseconds: end - start,
      externalId,
      fromNumber,
      status: "COMPLETED",
      toNumber
    }
  });
};
