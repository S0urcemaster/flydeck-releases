<script setup lang="ts">
defineProps<{
  workspaceName?: string;
  totalCount: number;
  loadDurationMs: number;
  focusDurationMs: number;
  loading: boolean;
  error: string;
}>();
</script>

<template>
  <footer class="statusbar">
    <span><i class="status-ok" /> Lokale V2-API</span>
    <span>{{ workspaceName ?? "Kein Workspace" }}</span>
    <span>{{ totalCount }} DATA-Knoten</span>
    <span class="status-detail">Laden {{ loadDurationMs.toFixed(0) }} ms</span>
    <span v-if="focusDurationMs" class="status-detail">Fokus {{ focusDurationMs.toFixed(1) }} ms</span>
    <span class="statusbar-spacer" />
    <span>{{ loading ? "Laden…" : error ? "Fehler" : "Bereit" }}</span>
  </footer>
</template>
