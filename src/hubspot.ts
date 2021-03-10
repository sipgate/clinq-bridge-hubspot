import {
  Config,
  Contact
} from "@clinq/bridge";
import { Client as Hubspot } from "@hubspot/api-client";
import {
  infoLogger,

  parseEnvironment
} from "./utils";

// interface CallDispostion {
//   id: string;
//   label: string;
// }

// // https://developers.hubspot.com/docs/methods/engagements/get-call-dispositions
// const CALL_DISPOSITION_HANGUP = "f240bbac-87c9-4f6e-bf70-924b57d47db7";

const { clientId, clientSecret, redirectUrl } = parseEnvironment();

const CONTACT_SCOPES = [
  // "crm.objects.custom.read", 
  // "crm.objects.custom.write", 
  "contacts"
]

export const createClient = async (apiKey: string) => {
  const [accessToken, refreshToken] = apiKey.split(":");
  if (refreshToken) {
    console.log("Refreshing token")
    const client = new Hubspot();

    const {
      body: { accessToken },
    } = await client.oauth.defaultApi.createToken(
      "refresh_token",
      undefined,
      undefined,
      clientId,
      clientSecret,
      refreshToken
    );

    console.log("new access token", accessToken)

    client.setAccessToken(accessToken);

    return client;
  }

  return new Hubspot({ accessToken });
};

export const getHubspotContacts = async (
  config: Config,
  after?: string,
  accumulated: Contact[] = []
): Promise<Contact[]> => {
  const client = await createClient(config.apiKey);

  const properties = [
    "phone",
    "mobilephone",
    "firstname",
    "lastname",
    "email",
    "company",
  ]

  // const options = {
  //   count: 100,
    // property: [
    //   "phone",
    //   "mobilephone",
    //   "firstname",
    //   "lastname",
    //   "email",
    //   "company",
    // ],
  //   vidOffset: page,
  // };

  try {
    const contactsResponse = await client.crm.contacts.basicApi.getPage(100, after, properties);
      // const contacts = data.contacts.map(convertToClinqContact);
    // const more = Boolean(data["has-more"]);
    // let nextPage = Number(data["vid-offset"]);

    const afterToken = contactsResponse.body.paging?.next?.after;

    const mergedContacts = [...accumulated, ...(contactsResponse.body.results as unknown as Contact[])];

    infoLogger(config, `Fetched ${mergedContacts.length} contacts`);

    if (afterToken) {
      return getHubspotContacts(config, afterToken, mergedContacts);
    } else {
      return mergedContacts;
    }
  } catch (error) {
    console.log("AAAAAAAAAAAAAAAH", JSON.stringify(error.response.body, null,2 ))
    return []
  }
};

// export const createHubspotContact = async (
//   { apiKey }: Config,
//   contact: ContactTemplate
// ): Promise<Contact> => {
//   const client = await createClient(apiKey);
//   return client.contacts.create(convertToHubspotContact(contact));
// };

// export const updateHubspotContact = async (
//   { apiKey }: Config,
//   id: string,
//   contact: ContactUpdate
// ): Promise<Contact> => {
//   const client = await createClient(apiKey);
//   await client.contacts.update(id, convertToHubspotContact(contact));
//   return client.contacts.getById(id);
// };

// export const deleteHubspotContact = async ({ apiKey }: Config, id: string) => {
//   const client = await createClient(apiKey);
//   return client.contacts.delete(id);
// };

// export const createCallEvent = async (config: Config, event: CallEvent) => {
//   const ownerId = await getOwnerId(config);

//   const phoneNumber =
//     event.direction === CallDirection.OUT ? event.to : event.from;

//   const contact = await getContactByPhoneNumber(config, phoneNumber);
//   if (!contact) {
//     return;
//   }

//   const contactId = contact["canonical-vid"];

//   infoLogger(config, `Adding engagement to contact ${contactId}`);

//   return createCallEngagement(config, contactId, ownerId, event);
// };

export const getHubspotOAuth2RedirectUrl = () => {
  const client = new Hubspot();
  const uri = client.oauth.getAuthorizationUrl(clientId, redirectUrl, CONTACT_SCOPES.join(" "))
  return Promise.resolve(uri)
};

export const handleHubspotOAuth2Callback = async (
  code: string
): Promise<{ apiKey: string; apiUrl: string }> => {
  const client = new Hubspot();

  const {body : {accessToken, refreshToken }} = await client.oauth.defaultApi.createToken(
    'authorization_code',
    code,
    redirectUrl,
    clientId,
    clientSecret,
)

  return {
    apiKey: `${accessToken}:${refreshToken}`,
    apiUrl: "",
  };
};

// const getOwnerId = async ({ apiKey }: Config) => {
//   const client = await createClient(apiKey);
//   const {
//     data: { user: email },
//   } = await axios.get<{ user: string }>(
//     `https://api.hubapi.com/oauth/v1/access-tokens/${client.accessToken}`
//   );

//   const owners = await client.owners.get({ email });

//   if (!owners.length || !owners[0].ownerId) {
//     throw new Error(`Cannot find owner id for email ${email}`);
//   }

//   return owners[0].ownerId;
// };

// const getContactByPhoneNumber = async (config: Config, phoneNumber: string) => {
//   const client = await createClient(config.apiKey);

//   infoLogger(config, `Searching for contact with phone number:`, phoneNumber);

//   const parsedPhoneNumber = parsePhoneNumber(phoneNumber);
//   const originalQuery = client.contacts.search(phoneNumber);
//   const localizedQuery = client.contacts.search(parsedPhoneNumber.localized);
//   const localizedQueryNormalized = client.contacts.search(
//     normalizePhoneNumber(parsedPhoneNumber.localized)
//   );
//   const e164Query = client.contacts.search(parsedPhoneNumber.e164);
//   const e164QueryNormalized = client.contacts.search(
//     normalizePhoneNumber(parsedPhoneNumber.e164)
//   );

//   const results = await Promise.all(
//     [
//       originalQuery,
//       localizedQuery,
//       localizedQueryNormalized,
//       e164Query,
//       e164QueryNormalized,
//     ].map((promise) => promise.catch(() => ({ contacts: [] })))
//   );

//   const result = results
//     .map(({ contacts }) => contacts)
//     .filter((contacts) => Array.isArray(contacts) && contacts.length > 0)
//     .find(Boolean);

//   if (!result) {
//     // tslint:disable-next-line: no-console
//     warnLogger(config, `Cannot find contact for phone number:`, phoneNumber);
//     return;
//   }

//   const contact = result[0];
//   infoLogger(config, `Found contact for phone number:`, phoneNumber);

//   return contact;
// };

// const createCallEngagement = async (
//   config: Config,
//   contactId: string,
//   ownerId: string,
//   {
//     id: externalId,
//     from: fromNumber,
//     to: toNumber,
//     end,
//     start,
//     start: timestamp,
//   }: CallEvent
// ) => {
//   const client = await createClient(config.apiKey);
//   const dispositions: CallDispostion[] = await client.engagements.getCallDispositions();
//   const disposition = dispositions
//     .filter((entry) => entry.label === "Connected")
//     .map((entry) => entry.id)
//     .find(Boolean);
//   return client.engagements.create({
//     associations: {
//       contactIds: [contactId],
//     },
//     engagement: {
//       active: true,
//       ownerId,
//       timestamp,
//       type: "CALL",
//     },
//     metadata: {
//       body: "",
//       disposition: disposition ? disposition : CALL_DISPOSITION_HANGUP,
//       durationMilliseconds: end - start,
//       externalId,
//       fromNumber,
//       status: "COMPLETED",
//       toNumber,
//     },
//   });
// };
