const Hubspot = require("hubspot");
const { PhoneNumberLabel } = require("@clinq/bridge");

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

const convertToClinqContact = function(contact) {
  const phoneNumbers = [];

  const landlinePhoneNumber = parsePhoneNumber(
    PhoneNumberLabel.WORK,
    contact.properties.phone
  );
  if (landlinePhoneNumber) {
    phoneNumbers.push(landlinePhoneNumber);
  }

  const mobilePhoneNumber = parsePhoneNumber(
    PhoneNumberLabel.MOBILE,
    contact.properties.mobilephone
  );
  if (mobilePhoneNumber) {
    phoneNumbers.push(mobilePhoneNumber);
  }

  const firstName = getFieldValue(contact.properties.firstname);
  const lastName = getFieldValue(contact.properties.lastname);

  return {
    id: String(contact.vid),
    name: null,
    firstName,
    lastName,
    email: getFieldValue(contact.properties.email),
    organization: getFieldValue(contact.properties.company),
    avatarUrl: null,
    contactUrl: getFieldValue(contact["profile-url"]),
    phoneNumbers
  };
};

const convertToHubspotContact = function({
  firstName: firstname,
  lastName: lastname,
  email,
  organization,
  phoneNumbers
}) {
  const phone = phoneNumbers.filter(
    phoneNumber => phoneNumber.label === PhoneNumberLabel.WORK
  );
  const mobilephone = phoneNumbers.filter(
    phoneNumber => phoneNumber.label === PhoneNumberLabel.MOBILE
  );

  const contact = {
    properties: [
      {
        property: "firstname",
        value: firstname
      },
      {
        property: "lastname",
        value: lastname
      },
      {
        property: "email",
        value: email
      },
      {
        property: "company",
        value: organization
      },
      {
        property: "phone",
        value: ""
      },
      {
        property: "mobilephone",
        value: ""
      }
    ]
  };

  if (!phone && !mobilephone) {
    contact.properties = contact.properties.filter(
      prop => prop.property !== "phone"
    );
    contact.properties.push({
      property: "phone",
      value: phoneNumbers[0].phoneNumber
    });
  } else {
    if (phone.length) {
      contact.properties = contact.properties.filter(
        prop => prop.property !== "phone"
      );
      contact.properties.push({
        property: "phone",
        value: phone[0].phoneNumber
      });
    }
    if (mobilephone.length) {
      contact.properties = contact.properties.filter(
        prop => prop.property !== "mobilephone"
      );
      contact.properties.push({
        property: "mobilephone",
        value: mobilephone[0].phoneNumber
      });
    }
  }
  return contact;
};

const fetchContacts = async (client, page) => {
  const options = {
    count: 100,
    property: [
      "phone",
      "mobilephone",
      "firstname",
      "lastname",
      "email",
      "company"
    ],
    vidOffset: page
  };
  const data = await client.contacts.get(options);
  return {
    contacts: data.contacts.map(convertToClinqContact),
    more: Boolean(data["has-more"]),
    nextPage: Number(data["vid-offset"])
  };
};

module.exports = {
  createClient,
  fetchContacts,
  convertToHubspotContact,
  convertToClinqContact
};
