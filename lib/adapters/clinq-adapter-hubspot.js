const Hubspot = require("hubspot");
const ClinqPhonenumber = require("../clinq-phonenumber");

const getFieldValue = field => {
	if (field && field.value) {
		return field.value;
	}
	return null;
};

const parsePhoneNumber = (label, phoneField) => {
	const value = getFieldValue(phoneField);
	if (value) {
		try {
			var phoneNumber = new ClinqPhonenumber(value);
			return { label, phoneNumber: phoneNumber.e123Number() };
		} catch (e) {
			console.log("Invalid phone number: " + value);
			return null;
		}
	}
	return null;
};

class HubspotAdapter {
	constructor(apiUrl, apiKey) {
		this.apiClient = new Hubspot({ apiKey: apiKey });
		this.getContacts = this.getContacts.bind(this);
		this.mapContacts = this.mapContacts.bind(this);
	}

	async getContacts(page) {
		var options = {
			count: 100,
			property: ["phone", "mobilephone", "firstname", "lastname", "email"],
			vidOffset: page
		};
		const data = await this.apiClient.contacts.get(options);
		return {
			contacts: data.contacts,
			more: Boolean(data["has-more"]),
			nextPage: Number(data["vid-offset"])
		};
	}

	mapContacts(contacts) {
		return contacts
			.filter(
				contact =>
					getFieldValue(contact.properties.firstname) && getFieldValue(contact.properties.lastname)
			)
			.map(contact => {
				const phoneNumbers = [];

				const landlinePhoneNumber = parsePhoneNumber("Landline", contact.properties.phone);
				if (landlinePhoneNumber) {
					phoneNumbers.push(landlinePhoneNumber);
				}

				const mobilePhoneNumber = parsePhoneNumber("Mobile", contact.properties.mobilephone);
				if (mobilePhoneNumber) {
					phoneNumbers.push(mobilePhoneNumber);
				}

				const firstname = getFieldValue(contact.properties.firstname);
				const lastname = getFieldValue(contact.properties.lastname);

				return {
					id: String(contact.vid),
					name: `${firstname} ${lastname}`,
					email: getFieldValue(contact.properties.email),
					company: null,
					phoneNumbers
				};
			})
			.filter(contact => contact.phoneNumbers.length > 0);
	}
}

module.exports = HubspotAdapter;
