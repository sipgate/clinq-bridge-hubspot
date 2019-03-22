import { PhoneNumberFormat, PhoneNumberUtil } from "google-libphonenumber";

const phoneUtil = PhoneNumberUtil.getInstance();

export const parsePhoneNumber = (phoneNumber: string) => {
  try {
    return {
      e164: phoneUtil.format(
        phoneUtil.parse(`+${phoneNumber}`),
        PhoneNumberFormat.INTERNATIONAL
      ),
      localized: phoneUtil.format(
        phoneUtil.parse(`+${phoneNumber}`),
        PhoneNumberFormat.NATIONAL
      )
    };
  } catch (error) {
    return { e164: phoneNumber, localized: phoneNumber };
  }
};