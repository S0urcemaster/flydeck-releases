export type RelayPostSummary = {
  id: string;
  label: string;
  localId: string;
  createdAt: string;
  updatedAt: string;
  imageUrl: string | null;
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
