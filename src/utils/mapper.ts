import { Contact, ContactTemplate, PhoneNumber, PhoneNumberLabel } from "@clinq/bridge";

export const convertToHubspotContact = ({
  firstName: firstname,
  lastName: lastname,
  email,
  organization,
  phoneNumbers
}: Contact | ContactTemplate) => {
  const phone = phoneNumbers.filter(phoneNumber => phoneNumber.label === PhoneNumberLabel.WORK);
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
    contact.properties = contact.properties.filter(prop => prop.property !== "phone");
    contact.properties.push({
      property: "phone",
      value: phoneNumbers[0].phoneNumber
    });
  } else {
    if (phone.length) {
      contact.properties = contact.properties.filter(prop => prop.property !== "phone");
      contact.properties.push({
        property: "phone",
        value: phone[0].phoneNumber
      });
    }
    if (mobilephone.length) {
      contact.properties = contact.properties.filter(prop => prop.property !== "mobilephone");
      contact.properties.push({
        property: "mobilephone",
        value: mobilephone[0].phoneNumber
      });
    }
  }
  return contact;
};

export const convertToClinqContact = (contact: any) => {
  const phoneNumbers: PhoneNumber[] = [];

  const landlinePhoneNumber = getFieldValue(contact.properties.phone);
  if (landlinePhoneNumber) {
    phoneNumbers.push({
      label: PhoneNumberLabel.WORK,
      phoneNumber: landlinePhoneNumber
    });
  }

  const mobilePhoneNumber = getFieldValue(contact.properties.mobilephone);
  if (mobilePhoneNumber) {
    phoneNumbers.push({
      label: PhoneNumberLabel.MOBILE,
      phoneNumber: mobilePhoneNumber
    });
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

const getFieldValue = (field: any) => (field && field.value ? field.value : null);
