const Hubspot = require("hubspot");

const createClient = apiKey => {
	return new Hubspot({ apiKey });
};

const getFieldValue = field => {
	if (field && field.value) {
		return field.value;
	}
	return null;
};

const createNormalizedPhoneNumber = raw => {
	if (!raw.match(/[0-9]/)) {
		throw new Error("Not a valid phone number");
	}
	return raw
		.replace(/[^0-9\+]/gi, "")
		.replace(/^00/, "")
		.replace(/^\+/, "")
		.replace(/^0/, "49");
};

const parsePhoneNumber = (label, phoneField) => {
	const value = getFieldValue(phoneField);
	if (value) {
		try {
			var phoneNumber = createNormalizedPhoneNumber(value);
			return { label, phoneNumber };
		} catch (e) {
			console.log("Invalid phone number: " + value);
			return null;
		}
	}
	return null;
};

const mapContacts = contacts => {
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
};

const fetchContacts = async (client, page) => {
	const options = {
		count: 100,
		property: ["phone", "mobilephone", "firstname", "lastname", "email"],
		vidOffset: page
	};
	const data = await client.contacts.get(options);
	return {
		contacts: mapContacts(data.contacts),
		more: Boolean(data["has-more"]),
		nextPage: Number(data["vid-offset"])
	};
};

module.exports = { createClient, fetchContacts };
