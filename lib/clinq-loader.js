const { unauthorized, ServerError } = require("@clinq/bridge");
const {
  fetchContacts,
  createClient,
  convertToHubspotContact,
  convertToClinqContact
} = require("./clinq-adapter-hubspot");

const CACHE_LIFETIME_MS = 60 * 60 * 1000;
const cache = new Map();

const anonymizeKey = apiKey => {
  return apiKey.substr(apiKey.length - 5);
};

const loadPage = async (client, page, accumulated) => {
  const { contacts, more, nextPage } = await fetchContacts(client, page);

  if (!nextPage) {
    nextPage++;
  }

  const mergedContacts = [...accumulated, ...contacts];

  if (more) {
    return loadPage(client, nextPage, mergedContacts);
  } else {
    return mergedContacts;
  }
};

const populateCache = async (apiKey, client) => {
  const anonKey = anonymizeKey(apiKey);

  if (!cache.has(apiKey)) {
    cache.set(apiKey, {
      loaded: true,
      list: [],
      timestamp: 0
    });
  }

  const cacheEntry = cache.get(apiKey);

  const isCacheValid = Date.now() - cacheEntry.timestamp < CACHE_LIFETIME_MS;

  if (isCacheValid) {
    console.log(
      `Cache is still valid for ${anonKey} (${cacheEntry.list.length} contacts)`
    );
    return;
  }

  if (!cacheEntry.loaded) {
    console.log(
      `Contacts already loading for ${anonKey} (currently ${
        cacheEntry.list.length
      } contacts)`
    );
    return;
  }

  cacheEntry.loaded = false;

  try {
    const list = await loadPage(client, 0, []);

    console.log(`Filled cache for ${anonKey} (${list.length} contacts)`);

    cache.set(apiKey, {
      loaded: true,
      timestamp: Date.now(),
      list
    });
  } catch (error) {
    console.error(error.message);
    delete cache[apiKey];
  }
};

const getContacts = async apiKey => {
  // TODO: check login
  const client = createClient(apiKey);

  if (!cache.has(apiKey)) {
    try {
      // Check login by loading first page of contacts
      await fetchContacts(client, 0);
    } catch (error) {
      unauthorized();
      console.error(
        `Could not get contacts for key "${anonymizeKey(apiKey)}: ${
          error.message
        }"`
      );
      throw new ServerError(400, "Could not get contacts");
    }
  }

  populateCache(apiKey, client);
  return cache.get(apiKey).list;
};

const createContact = async (apiKey, contact) => {
  const anonKey = anonymizeKey(apiKey);

  try {
    const client = createClient(apiKey);
    const hubspotContact = await client.contacts.create(
      convertToHubspotContact(contact)
    );
    contact = convertToClinqContact(hubspotContact);
  } catch (error) {
    console.error(
      `Could not create contact for key "${anonKey}: ${error.message}"`
    );
    throw new ServerError(400, "Could not create contact");
  }

  console.log(`Created contact for ${anonKey}`);

  return contact;
};

const updateContact = async (apiKey, id, contact) => {
  const anonKey = anonymizeKey(apiKey);

  try {
    const client = createClient(apiKey);
    const hubspotContact = await client.contacts.update(
      id,
      convertToHubspotContact(contact)
    );
  } catch (error) {
    console.error(
      `Could not update contact for key "${anonKey}: ${error.message}"`
    );
    throw new ServerError(400, "Could not update contact");
  }

  console.log(`Updated contact for ${anonKey}`);
  return {
    id: contact.id || id,
    organization: contact.organization || null,
    email: contact.email || null,
    name: contact.name || null,
    firstName: contact.firstName || null,
    lastName: contact.lastName || null,
    contactUrl: contact.contactUrl || null,
    avatarUrl: contact.avatarUrl || null,
    phoneNumbers: contact.phoneNumbers
  };
};

const deleteContact = async (apiKey, id) => {
  const anonKey = anonymizeKey(apiKey);

  try {
    const client = createClient(apiKey);
    const response = await client.contacts.delete(id);
  } catch (error) {
    console.error(
      `Could not delete contact for key "${anonKey}: ${error.message}"`
    );
    throw new ServerError(404, "Could not delete contact");
  }
  console.log(`Deleted contact for ${anonKey}`);
};

module.exports = { getContacts, createContact, updateContact, deleteContact };
