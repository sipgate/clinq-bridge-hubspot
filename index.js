const Clinq = require("clinq-crm-bridge");
const ClinqLoader = require("./lib/clinq-loader");
const ClinqAdapter = require("./lib/adapters/clinq-adapter-hubspot");
const clinqLoader = new ClinqLoader(ClinqAdapter)

const adapter = {
	getContacts: async ({ apiKey, apiUrl }) => {
        return clinqLoader.fetchContacts(apiKey, apiUrl)
	}
};

Clinq.start(adapter);
