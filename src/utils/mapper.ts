import {
  Contact,
  ContactTemplate,
  PhoneNumber,
  PhoneNumberLabel,
} from "@clinq/bridge";
import {
  SimplePublicObject,
  SimplePublicObjectInput,
} from "@hubspot/api-client/lib/codegen/crm/companies/api";

export const convertToHubspotContact = ({
  firstName: firstname,
  lastName: lastname,
  email,
  organization,
  phoneNumbers,
}: Contact | ContactTemplate): SimplePublicObjectInput => {
  const phone = phoneNumbers.filter(
    (phoneNumber) => phoneNumber.label === PhoneNumberLabel.WORK
  );
  const mobilephone = phoneNumbers.filter(
    (phoneNumber) => phoneNumber.label === PhoneNumberLabel.MOBILE
  );

  let contact = {
    properties: {
      firstname: firstname || "",
      lastname: lastname || "",
      email: email || "",
      company: organization || "",
      phone: "",
      mobilephone: "",
    },
  };

  if (!phone && !mobilephone) {
    contact = {
      ...contact,
      properties: {
        ...contact.properties,
        phone: phoneNumbers[0].phoneNumber,
      },
    };
  } else {
    if (phone.length) {
      contact = {
        ...contact,
        properties: {
          ...contact.properties,
          phone: phone[0].phoneNumber,
        },
      };
    }
    if (mobilephone.length) {
      contact = {
        ...contact,
        properties: {
          ...contact.properties,
          mobilephone: mobilephone[0].phoneNumber,
        },
      };
    }
  }
  return contact;
};

export const convertToClinqContact = (
  contact: SimplePublicObject,
  hubId?: number
): Contact => {
  const phoneNumbers: PhoneNumber[] = [];

  const landlinePhoneNumber = getFieldValue(contact.properties.phone);
  if (landlinePhoneNumber) {
    phoneNumbers.push({
      label: PhoneNumberLabel.WORK,
      phoneNumber: landlinePhoneNumber,
    });
  }

  const mobilePhoneNumber = getFieldValue(contact.properties.mobilephone);
  if (mobilePhoneNumber) {
    phoneNumbers.push({
      label: PhoneNumberLabel.MOBILE,
      phoneNumber: mobilePhoneNumber,
    });
  }

  const firstName = getFieldValue(contact.properties.firstname);
  const lastName = getFieldValue(contact.properties.lastname);

  return {
    avatarUrl: null,
    contactUrl: hubId
      ? `https://app.hubspot.com/contacts/${hubId}/contact/${contact.id}/`
      : null,
    email: getFieldValue(contact.properties.email),
    firstName,
    id: String(contact.id),
    lastName,
    name: null,
    organization: getFieldValue(contact.properties.company),
    phoneNumbers,
  };
};

const getFieldValue = (field: any) => field || null;
