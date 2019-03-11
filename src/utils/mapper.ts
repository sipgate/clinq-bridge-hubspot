import {
  CallState,
  Contact,
  ContactTemplate,
  PhoneNumber,
  PhoneNumberLabel
} from "@clinq/bridge";

// https://developers.hubspot.com/docs/methods/engagements/get-call-dispositions
export const convertCallStateToDisposition = (state: CallState) => {
  switch (state) {
    case CallState.BUSY:
      return "9d9162e7-6cf3-4944-bf63-4dff82258764";
    case CallState.FINISHED:
    case CallState.HANGUP:
      return "f240bbac-87c9-4f6e-bf70-924b57d47db7";
    case CallState.MISSED:
    case CallState.CANCEL:
    case CallState.REJECTED:
    case CallState.REJECTED_OPENING_HOURS:
      return "73a0d17f-1163-4015-bdd5-ec830791da20";
    case CallState.NOTFOUND:
      return "17b47fee-58de-441e-a44c-c6300d46f273";
    default:
      return "";
  }
};

export const convertToHubspotContact = ({
  firstName: firstname,
  lastName: lastname,
  email,
  organization,
  phoneNumbers
}: Contact | ContactTemplate) => {
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

const getFieldValue = (field: any) =>
  field && field.value ? field.value : null;
