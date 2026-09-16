export type ExchangeRequest = {
  protocolVersion: 1;
  id: string;
  sentAt: string;
  node: {
    nodeId: string;
    origin: string;
    title: string;
    publicKey: string;
    fingerprint: string;
  };
  signature: string;
};

export function exchangePayload(request: object) {
  return JSON.stringify(request);
}

export type ExchangeAcceptance = {
  protocolVersion: 1; requestId: string; sentAt: string;
  node: ExchangeRequest["node"]; signature: string;
};
