import { Config } from "@clinq/bridge";

const anonymizeKey = (apiKey: string) =>
  `******${apiKey.substr(apiKey.length - 5)}`;

export const infoLogger = ({ apiKey }: Config, message: string) => {
  // tslint:disable-next-line:no-console
  console.log(`${anonymizeKey(apiKey)}: ${message}`);
};

export const errorLogger = ({ apiKey }: Config, message: string) => {
  // tslint:disable-next-line:no-console
  console.error(`${anonymizeKey(apiKey)}: ${message}`);
};
