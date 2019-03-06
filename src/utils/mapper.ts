import { PhoneNumberLabel } from "@clinq/bridge";

export const convertToHubspotContact = ({
  firstName: firstname,
  lastName: lastname,
  email,
  organization,
  phoneNumbers
}) => {
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

export const convertToClinqContact = contact => {
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
    avatarUrl: null,
    contactUrl: getFieldValue(contact["profile-url"]),
    email: getFieldValue(contact.properties.email),
    firstName,
    id: String(contact.vid),
    lastName,
    name: null,
    organization: getFieldValue(contact.properties.company),
    phoneNumbers
  };
};

const getFieldValue = field => (field && field.value ? field.value : null);

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
      const phoneNumber = createNormalizedPhoneNumber(value);
      return { label, phoneNumber };
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.log("Invalid phone number: " + value);
      return null;
    }
  }
  return null;
};
