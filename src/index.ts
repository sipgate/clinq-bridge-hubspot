import { Adapter, start } from "@clinq/bridge";
import {
  createContact,
  deleteContact,
  getContacts,
  getOAuth2RedirectUrl,
  handleCallEvent,
  handleOAuth2Callback,
  updateContact,
} from "./adapter";

const adapter: Adapter = {
  createContact,
  deleteContact,
  getContacts,
  getOAuth2RedirectUrl,
  handleCallEvent,
  handleOAuth2Callback,
  updateContact,
};

start(adapter);
