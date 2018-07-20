const Hubspot = require("hubspot");
const ClinqPhonenumber = require("../clinq-phonenumber");

class HubspotAdapter {
	constructor(apiUrl, apiKey) {
		this.apiClient = new Hubspot({ apiKey: apiKey });
		this.getContacts = this.getContacts.bind(this);
		this.mapContacts = this.mapContacts.bind(this);
	}

	getContacts(page) {
		var options = {
			count: 100,
			property: ["phone", "mobilephone", "firstname", "lastname", "email"],
			vidOffset: page
		};
		return this.apiClient.contacts.get(options).then(data => {
			return { contacts: data.contacts, more: data["has-more"], next_page: data["vid-offset"] };
		});
	}

	mapContacts(input) {
		var data = [];
		input.forEach(contact => {
			if (
				typeof contact.properties.firstname !== "undefined" &&
				typeof contact.properties.lastname !== "undefined"
			) {
				var mapped = {
					id: String(contact.vid),
					name: contact.properties.firstname.value + " " + contact.properties.lastname.value,
					email: contact.properties.email.value || null,
					company: null
				};
				mapped.phoneNumbers = [];
				if (typeof contact.properties.phone !== "undefined" && contact.properties.phone != "") {
					try {
						var landline = new ClinqPhonenumber(contact.properties.phone.value);
						mapped.phoneNumbers.push({ label: "Landline", phoneNumber: landline.e123Number() });
					} catch (e) {
						console.log("Invalid: " + contact.properties.phone.value);
					}
				}
				if (
					typeof contact.properties.mobilephone !== "undefined" &&
					contact.properties.mobilephone != ""
				) {
					try {
						var mobile = new ClinqPhonenumber(contact.properties.mobilephone.value);
						mapped.phoneNumbers.push({ label: "Mobile", phoneNumber: mobile.e123Number() });
					} catch (e) {
						console.log("Invalid: " + contact.properties.phone.value);
					}
				}
				if (mapped.phoneNumbers.length > 0) data.push(mapped);
			}
		});
		return data;
	}
}

module.exports = HubspotAdapter;
