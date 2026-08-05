import type { TreeBrowserInitialNode } from "../../components/TreeBrowser";
import source from "../../assets/default-agent-memory.json";

export type AgentMemoryData = {
  initialContent: string;
};

type AgentMemoryNode = {
  id: string;
  label: string;
  enabled: boolean;
  contentVisible: boolean;
  content: string;
  children: AgentMemoryNode[];
};

export type AgentMemoryDocument = {
  version: number;
  name: string;
  nodes: AgentMemoryNode[];
};

export const defaultAgentMemory = parseAgentMemory(source);

export const agentMemoryInitialTree: TreeBrowserInitialNode<AgentMemoryData>[] =
  defaultAgentMemory.nodes.map(toTreeNode);

export const agentMemoryInitialDrafts = Object.fromEntries(
  flatten(defaultAgentMemory.nodes).map((node) => [node.id, node.content]),
);

function parseAgentMemory(value: unknown): AgentMemoryDocument {
  if (!isRecord(value)
    || !Number.isInteger(value.version)
    || Number(value.version) < 1
    || typeof value.name !== "string"
    || !Array.isArray(value.nodes)) {
    throw new Error("default-agent-memory.json has an invalid document header");
  }

  const ids = new Set<string>();
  const nodes = value.nodes.map((node, index) => parseNode(node, `nodes[${index}]`, ids));
  return { version: Number(value.version), name: value.name, nodes };
}

function parseNode(value: unknown, path: string, ids: Set<string>): AgentMemoryNode {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || !/^[a-z0-9][a-z0-9-]*$/.test(value.id)
    || typeof value.label !== "string"
    || value.label.trim() === ""
    || typeof value.enabled !== "boolean"
    || typeof value.contentVisible !== "boolean"
    || typeof value.content !== "string"
    || !Array.isArray(value.children)) {
    throw new Error(`default-agent-memory.json has an invalid node at ${path}`);
  }
  if (ids.has(value.id)) {
    throw new Error(`default-agent-memory.json contains duplicate id ${value.id}`);
  }
  ids.add(value.id);
  return {
    id: value.id,
    label: value.label,
    enabled: value.enabled,
    contentVisible: value.contentVisible,
    content: value.content,
    children: value.children.map((child, index) => (
      parseNode(child, `${path}.children[${index}]`, ids)
    )),
  };
}

function toTreeNode(node: AgentMemoryNode): TreeBrowserInitialNode<AgentMemoryData> {
  return {
    id: node.id,
    label: node.label,
    enabled: node.enabled,
    contentVisible: node.contentVisible,
    data: { initialContent: node.content },
    children: node.children.map(toTreeNode),
  };
}

function flatten(nodes: AgentMemoryNode[]): AgentMemoryNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
