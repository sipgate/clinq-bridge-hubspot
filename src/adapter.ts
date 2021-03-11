import {
  CallEvent,
  Config,
  Contact,
  ContactTemplate,
  ContactUpdate,
  ServerError
} from "@clinq/bridge";
import { Request } from "express";
import {
  archiveHubspotContact,
  createCallEvent,
  createHubspotContact,
  getHubspotContacts,
  getHubspotOAuth2RedirectUrl,
  handleHubspotOAuth2Callback,
  updateHubspotContact
} from "./hubspot";
import { errorLogger, infoLogger } from "./utils";

export const getContacts = async (config: Config) => {
  try {
    return getHubspotContacts(config);
  } catch (error) {
    errorLogger(config, `Could not get contacts: ${error.message}"`);
    throw new ServerError(500, "Could not get contacts");
  }
};

export const createContact = async (config: Config, contact: ContactTemplate): Promise<Contact> => {
  try {
    const hubspotContact = await createHubspotContact(config, contact);
    infoLogger(config, `Created contact ${hubspotContact.id}`);
    return hubspotContact;
  } catch (error) {
    errorLogger(config, `Could not create: ${error.message}"`);
    throw new ServerError(500, "Could not create contact");
  }
};

export const updateContact = async (
  config: Config,
  id: string,
  contact: ContactUpdate
): Promise<Contact> => {
  try {
    const hubspotContact = await updateHubspotContact(config, id, contact);
    return hubspotContact;
  } catch (error) {
    errorLogger(config, `Could not update contact: ${error.message}"`);
    throw new ServerError(500, "Could not update contact");
  }
};

export const deleteContact = async (config: Config, id: string) => {
  try {
    await archiveHubspotContact(config, id);
    infoLogger(config, `Deleted contact ${id}`);
  } catch (error) {
    errorLogger(config, `Could not delete contact: ${error.message}"`);
    throw new ServerError(500, "Could not delete contact");
  }
};

export const handleCallEvent = async (config: Config, event: CallEvent) => {
  infoLogger(config, `Creating call event for ${event.id}, user ${event.user.id}`);
  try {
    await createCallEvent(config, event);
    infoLogger(config, `Created call event for ${event.id}, user ${event.user.id}`);
  } catch (error) {
    errorLogger(config, `Could not create call event: ${error.message}", user ${event.user.id}`);
    throw new ServerError(500, "Could not create call event");
  }
};

export const getOAuth2RedirectUrl = getHubspotOAuth2RedirectUrl;

export const handleOAuth2Callback = async ({
  query: { code }
}: Request): Promise<{ apiKey: string; apiUrl: string }> => {
    return handleHubspotOAuth2Callback(code as string);
  };
