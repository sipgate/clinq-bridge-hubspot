export const anonymizeKey = apiKey =>
  `******${apiKey.substr(apiKey.length - 5)}`;
