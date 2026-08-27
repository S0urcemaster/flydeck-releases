CREATE TABLE agent_chat_conversations (
  id uuid PRIMARY KEY REFERENCES tree_nodes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  codex_thread_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agent_chat_conversations_workspace_idx
  ON agent_chat_conversations(workspace_id, updated_at DESC);

CREATE TABLE agent_chat_messages (
  id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL
    REFERENCES agent_chat_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agent_chat_messages_conversation_idx
  ON agent_chat_messages(conversation_id, created_at, id);

CREATE TABLE agent_chat_runs (
  id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL
    REFERENCES agent_chat_conversations(id) ON DELETE CASCADE,
  request_id uuid NOT NULL UNIQUE,
  status text NOT NULL CHECK (
    status IN ('queued', 'running', 'completed', 'failed', 'cancelled', 'interrupted')
  ),
  prompt text NOT NULL,
  output text NOT NULL DEFAULT '',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agent_chat_runs_conversation_idx
  ON agent_chat_runs(conversation_id, created_at DESC);
