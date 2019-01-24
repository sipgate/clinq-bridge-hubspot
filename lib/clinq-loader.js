const { unauthorized } = require("@clinq/bridge");
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
    }
  }

  populateCache(apiKey, client);
  return cache.get(apiKey).list;
};

const createContact = async (apiKey, contact) => {
  const client = createClient(apiKey);

  const hubspotContact = await client.contacts.create(
    convertToHubspotContact(contact)
  );

  contact = convertToClinqContact(hubspotContact);
  const anonKey = anonymizeKey(apiKey);
  console.log(`Created contact for ${anonKey}`);

  return contact;
};

module.exports = { getContacts, createContact };
