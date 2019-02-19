const {
  ServerError
} = require("@clinq/bridge");
const {
  fetchContacts,
  createClient,
  convertToHubspotContact,
  convertToClinqContact
} = require("./clinq-adapter-hubspot");

const anonymizeKey = apiKey => {
  return `******${apiKey.substr(apiKey.length - 5)}`;
};

const loadPage = async (apiKey, client, page, accumulated) => {
  const anonKey = anonymizeKey(apiKey);
  const {
    contacts,
    more,
    nextPage
  } = await fetchContacts(client, page);

  if (!nextPage) {
    nextPage++;
  }

  const mergedContacts = [...accumulated, ...contacts];

  console.log(`Fetched ${mergedContacts.length} contacts for key ${anonKey}`);

  if (more) {
    return loadPage(apiKey, client, nextPage, mergedContacts);
  } else {
    return mergedContacts;
  }
};


const getContacts = async apiKey => {
  const client = createClient(apiKey);
  return await loadPage(apiKey, client, 0, []);
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
    await client.contacts.update(
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
    await client.contacts.delete(id);
  } catch (error) {
    console.error(
      `Could not delete contact for key "${anonKey}: ${error.message}"`
    );
    throw new ServerError(404, "Could not delete contact");
  }
  console.log(`Deleted contact for ${anonKey}`);
};

module.exports = {
  getContacts,
  createContact,
  updateContact,
  deleteContact
};
