export type RelayPostSummary = {
  id: string;
  label: string;
  localId: string;
  createdAt: string;
  updatedAt: string;
  imageUrl: string | null;
  childCount: number;
  hasChildren: boolean;
};

export type RelayPost = RelayPostSummary & {
  format: "text" | "markdown" | "json";
  content: string;
  children: RelayPostSummary[];
};

export type RelayNavigationLevel = {
  activeId: string | null;
  depth: number;
  nodes: RelayPostSummary[];
};

export type RelaySite = {
  title: string;
  info: string;
  roots: RelayPostSummary[];
};

export type RelayNodePage = {
  post: RelayPost;
  parents: RelayPostSummary[];
  levels: RelayNavigationLevel[];
};

export type RelayError = {
  error: string;
  message: string;
};

export const relayPublicationSchemaVersion = 1 as const;

export type RelayAssetRole = "hero" | "attachment" | "video" | "audio";

export type RelayPublicationAsset = {
  sha256: string;
  mimeType: string;
  byteSize: number;
  originalName: string | null;
};

export type RelayPublicationNodeAsset = {
  sha256: string;
  role: RelayAssetRole;
  position: number;
  alt: string | null;
};

export type RelayPublicationNode = {
  id: string;
  parentId: string | null;
  localId: string;
  position: number;
  label: string;
  createdAt: string;
  updatedAt: string;
  format: "text" | "markdown" | "json";
  content: string;
  assets: RelayPublicationNodeAsset[];
};

export type RelayPublicationManifestV1 = {
  schemaVersion: typeof relayPublicationSchemaVersion;
  publicationId: string;
  version: number;
  title: string;
  info: string;
  createdAt: string;
  assets: RelayPublicationAsset[];
  nodes: RelayPublicationNode[];
};

export type RelayIngestStageResult = {
  publicationId: string;
  version: number;
  missingAssets: string[];
  status: "staging";
};

export type RelayIngestActivationResult = {
  publicationId: string;
  version: number;
  status: "active";
};
