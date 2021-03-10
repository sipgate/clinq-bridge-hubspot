export type HubInfo = {
  token: string;
  user: string;
  hub_domain: string;
  scopes: string[];
  scope_to_scope_group_pks: number[];
  hub_id: number;
  app_id: number;
  expires_in: number;
  user_id: number;
  token_type: string;
};

export type CallDispostion = {
  id: string;
  label: string;
};

// https://developers.hubspot.com/docs/methods/engagements/get-call-dispositions
export const CALL_DISPOSITION_HANGUP = "f240bbac-87c9-4f6e-bf70-924b57d47db7";
