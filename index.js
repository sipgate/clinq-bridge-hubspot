const clinq = require("@clinq/bridge");
const ClinqLoader = require("./lib/clinq-loader");
const ClinqAdapter = require("./lib/adapters/clinq-adapter-hubspot");
const clinqLoader = new ClinqLoader(ClinqAdapter);

const adapter = {
	getContacts: async ({ apiKey, apiUrl }) => {
		try {
			const contacts = await clinqLoader.fetchContacts(apiKey, apiUrl);
			return contacts;
		} catch (error) {
			clinq.unauthorized();
		}
	}
};

clinq.start(adapter);
