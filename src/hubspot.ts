import {
  CallDirection,
  CallEvent,
  Config,
  Contact,
  ContactTemplate,
  ContactUpdate,
} from "@clinq/bridge";
import { Client as Hubspot } from "@hubspot/api-client";
import Axios from "axios";
import HubspotLegacyClient from "hubspot";
import { CallDispostion, CALL_DISPOSITION_HANGUP, HubInfo } from "./model";
import {
  convertToClinqContact,
  convertToHubspotContact,
  infoLogger,
  normalizePhoneNumber,
  parseEnvironment,
  parsePhoneNumber,
  warnLogger,
} from "./utils";

const { clientId, clientSecret, redirectUrl } = parseEnvironment();

const CONTACT_SCOPES = ["contacts"];

type TokenInfo = {
  token: string;
  expiresIn: number;
  updatedAt: number;
};

const tokenCache = new Map<string, TokenInfo>();

const isTokenValid = (apiKey: string) => {
  const tokenInfo = tokenCache.get(apiKey);
  if (!tokenInfo) {
    return false;
  }
  return Date.now() < tokenInfo.updatedAt + tokenInfo.expiresIn;
};

export const createClient = async (config: Config) => {
  const [accessToken, refreshToken] = config.apiKey.split(":");
  const client = new Hubspot();

  if (!isTokenValid(config.apiKey)) {
    infoLogger(config, `Refreshing access token`);
    const {
      body: { accessToken, expiresIn },
    } = await client.oauth.defaultApi.createToken(
      "refresh_token",
      undefined,
      undefined,
      clientId,
      clientSecret,
      refreshToken
    );

    client.setAccessToken(accessToken);

    tokenCache.set(config.apiKey, {
      token: accessToken,
      expiresIn,
      updatedAt: Date.now(),
    });

    return client;
  }

  const cachedToken = tokenCache.get(config.apiKey)?.token || accessToken;

  client.setAccessToken(cachedToken);

  return client;
};

export const getHubspotContacts = async (
  config: Config,
  after?: string,
  hubId?: number,
  accumulated: Contact[] = []
): Promise<Contact[]> => {
  const client = await createClient(config);

  const properties = ["phone", "mobilephone", "firstname", "lastname", "email", "company"];

  let userHubId = hubId;

  if (!userHubId) {
    const { hub_id } = await getTokenInfo(config);
    userHubId = hub_id;
  }

  const contactsResponse = await client.crm.contacts.basicApi.getPage(100, after, properties);

  const mappedContacts = contactsResponse.body.results.map((c) =>
    convertToClinqContact(c, userHubId)
  );

  const afterToken = contactsResponse.body.paging?.next?.after;

  const mergedContacts = [...accumulated, ...mappedContacts];

  infoLogger(config, `Fetched ${mergedContacts.length} contacts`);

  if (afterToken) {
    return getHubspotContacts(config, afterToken, userHubId, mergedContacts);
  } else {
    return mergedContacts;
  }
};

export const createHubspotContact = async (
  config: Config,
  contact: ContactTemplate
): Promise<Contact> => {
  const client = await createClient(config);
  const hubspotContact = convertToHubspotContact(contact);
  const { hub_id } = await getTokenInfo(config);
  const { body } = await client.crm.contacts.basicApi.create(hubspotContact);
  return convertToClinqContact(body, hub_id);
};

export const updateHubspotContact = async (
  config: Config,
  id: string,
  contact: ContactUpdate
): Promise<Contact> => {
  const client = await createClient(config);
  const hubspotContact = convertToHubspotContact(contact);
  const { hub_id } = await getTokenInfo(config);
  const { body } = await client.crm.contacts.basicApi.update(id, hubspotContact);
  return convertToClinqContact(body, hub_id);
};

export const archiveHubspotContact = async (config: Config, id: string) => {
  const client = await createClient(config);
  return client.crm.contacts.basicApi.archive(id);
};

export const createCallEvent = async (config: Config, event: CallEvent) => {
  const ownerId = await getOwnerId(config);

  const phoneNumber = event.direction === CallDirection.OUT ? event.to : event.from;

  const contact = await getContactByPhoneNumber(config, phoneNumber);
  if (!contact) {
    return;
  }

  const contactId = contact.id;

  infoLogger(config, `Adding engagement to contact ${contactId}`);

  return createCallEngagement(config, contactId, ownerId, event);
};

export const getHubspotOAuth2RedirectUrl = () => {
  const client = new Hubspot();
  const uri = client.oauth.getAuthorizationUrl(clientId, redirectUrl, CONTACT_SCOPES.join(" "));
  return Promise.resolve(uri);
};

export const handleHubspotOAuth2Callback = async (
  code: string
): Promise<{ apiKey: string; apiUrl: string }> => {
  const client = new Hubspot();

  const {
    body: { accessToken, refreshToken },
  } = await client.oauth.defaultApi.createToken(
    "authorization_code",
    code,
    redirectUrl,
    clientId,
    clientSecret
  );

  return {
    apiKey: `${accessToken}:${refreshToken}`,
    apiUrl: "",
  };
};

const getTokenInfo = async (config: Config) => {
  infoLogger(config, `Get token info`);

  const client = await createClient(config);
  const accessToken = client.getOptions().accessToken;

  const { data } = await Axios.get<HubInfo>(
    `https://api.hubapi.com/oauth/v1/access-tokens/${accessToken}`
  );
  return data;
};

const getOwnerId = async (config: Config) => {
  const client = await createClient(config);
  const { user: email } = await getTokenInfo(config);

  const {
    body: { results },
  } = await client.crm.owners.defaultApi.getPage(email);

  if (!results.length || !results[0].id) {
    throw new Error(`Cannot find owner id for email ${email}`);
  }

  return results[0].id;
};

const getContactByPhoneNumber = async (config: Config, phoneNumber: string) => {
  const client = await createClient(config);

  infoLogger(config, `Searching for contact with phone number:`, phoneNumber);

  const parsedPhoneNumber = parsePhoneNumber(phoneNumber);

  const searchPromise = (value: string) =>
    client.crm.contacts.searchApi.doSearch({
      query: value,
      after: 0,
      sorts: [],
      properties: ["mobilephone", "phone"],
      limit: 20,
      filterGroups: [],
    });

  const originalQuery = searchPromise(phoneNumber);
  const localizedQuery = searchPromise(parsedPhoneNumber.localized);
  const localizedQueryNormalized = searchPromise(normalizePhoneNumber(parsedPhoneNumber.localized));
  const e164Query = searchPromise(parsedPhoneNumber.e164);
  const e164QueryNormalized = searchPromise(normalizePhoneNumber(parsedPhoneNumber.e164));

  const results = await Promise.all(
    [originalQuery, localizedQuery, localizedQueryNormalized, e164Query, e164QueryNormalized].map(
      (promise) => promise.catch(() => ({ body: { results: [] } }))
    )
  );

  const result = results
    .map(({ body: { results } }) => results)
    .filter((contacts) => Array.isArray(contacts) && contacts.length > 0)
    .find(Boolean);

  if (!result) {
    // tslint:disable-next-line: no-console
    warnLogger(config, `Cannot find contact for phone number:`, phoneNumber);
    return;
  }

  const contact = result[0];
  infoLogger(config, `Found contact for phone number:`, phoneNumber);

  return contact;
};

const createCallEngagement = async (
  config: Config,
  contactId: string,
  ownerId: string,
  { id: externalId, from: fromNumber, to: toNumber, end, start, start: timestamp }: CallEvent
) => {
  const client = await createClient(config);
  const accessToken = client.getOptions().accessToken;

  if (!accessToken) {
    throw new Error(`No access token found`);
  }
  const legacyClient = new HubspotLegacyClient({ accessToken, clientId, clientSecret });

  const dispositions: CallDispostion[] = await legacyClient.engagements.getCallDispositions();
  const disposition = dispositions
    .filter((entry) => entry.label === "Connected")
    .map((entry) => entry.id)
    .find(Boolean);

  return legacyClient.engagements.create({
    associations: {
      contactIds: [contactId],
    },
    engagement: {
      active: true,
      ownerId,
      timestamp,
      type: "CALL",
    },
    metadata: {
      body: "",
      disposition: disposition ? disposition : CALL_DISPOSITION_HANGUP,
      durationMilliseconds: end - start,
      externalId,
      fromNumber,
      status: "COMPLETED",
      toNumber,
    },
  });
};
