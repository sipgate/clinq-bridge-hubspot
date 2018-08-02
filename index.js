const clinq = require("@clinq/bridge");
const { getContacts } = require("./lib/clinq-loader");

const adapter = {
	getContacts: async ({ apiKey, apiUrl }) => {
		return await getContacts(apiKey, apiUrl);
	}
};

clinq.start(adapter);
