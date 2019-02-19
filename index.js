const {
  start
} = require("@clinq/bridge");
const {
  getContacts,
  createContact,
  updateContact,
  deleteContact
} = require("./lib/clinq-loader");

const adapter = {
  getContacts: async ({
    apiKey,
    apiUrl
  }) => {
    return await getContacts(apiKey, apiUrl);
  },
  createContact: async ({
    apiKey,
    apiUrl
  }, contact) => {
    return await createContact(apiKey, contact);
  },
  updateContact: async ({
    apiKey,
    apiUrl
  }, id, contact) => {
    return await updateContact(apiKey, id, contact);
  },
  deleteContact: async ({
    apiKey,
    apiUrl
  }, id) => {
    return await deleteContact(apiKey, id);
  }
};

start(adapter);
