const clinq = require("@clinq/bridge");
const { getContacts, createContact } = require("./lib/clinq-loader");

const adapter = {
  getContacts: async ({ apiKey, apiUrl }) => {
    return await getContacts(apiKey, apiUrl);
  },
  createContact: async ({ apiKey, apiUrl }, contact) => {
    return await createContact(apiKey, contact);
  }
};

clinq.start(adapter);
