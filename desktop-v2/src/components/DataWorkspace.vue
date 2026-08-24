<script setup lang="ts">
import { DataAnalysis, Search } from "@element-plus/icons-vue";
import type { TreeRow } from "../api";
import type { ModuleId } from "../ui";
import ResponsiveTreeTable from "./ResponsiveTreeTable.vue";

defineProps<{
  activeModule: ModuleId;
  activeRoot: TreeRow | null;
  sectionTitle: string;
  search: string;
  visibleCount: number;
  totalCount: number;
  revision?: number;
  error: string;
  loading: boolean;
  rows: TreeRow[];
  expandedRowKeys: Array<string | number>;
  selectedId?: string;
  enabledSavingIds: string[];
}>();

const emit = defineEmits<{
  "update:search": [value: string];
  "update:expandedRowKeys": [value: Array<string | number>];
  reload: [];
  selectRow: [row: TreeRow];
  toggleEnabled: [row: TreeRow, enabled: boolean];
}>();

function relayToggleEnabled(row: TreeRow, enabled: boolean) {
  emit("toggleEnabled", row, enabled);
}

</script>

<template>
  <main class="content-panel">
    <template v-if="activeModule === 'DATA'">
      <section class="content-heading">
        <div class="content-title">
          <div class="eyebrow">Home / DATA<span v-if="activeRoot"> / {{ activeRoot.label }}</span></div>
          <h1>{{ sectionTitle }}</h1>
        </div>
        <el-input
          :model-value="search"
          class="content-search"
          :prefix-icon="Search"
          clearable
          placeholder="Teilbaum durchsuchen"
          @update:model-value="$emit('update:search', $event)"
        />
      </section>

      <div class="view-tabs">
        <strong>Tree Table</strong>
        <span>{{ visibleCount }} im Bereich · {{ totalCount }} gesamt · Revision {{ revision ?? "–" }}</span>
      </div>

      <div v-if="error" class="state-panel error-state">
        <strong>DATA konnte nicht geladen werden</strong><span>{{ error }}</span>
        <el-button type="primary" @click="$emit('reload')">Erneut versuchen</el-button>
      </div>
      <div v-else class="table-wrap" v-loading="loading">
        <el-auto-resizer>
          <template #default="{ height, width }">
            <ResponsiveTreeTable
              :width="width"
              :height="height"
              :rows="rows"
              :expanded-row-keys="expandedRowKeys"
              :selected-id="selectedId"
              :enabled-saving-ids="enabledSavingIds"
              @update:expanded-row-keys="$emit('update:expandedRowKeys', $event)"
              @select-row="$emit('selectRow', $event)"
              @toggle-enabled="relayToggleEnabled"
            />
          </template>
        </el-auto-resizer>
      </div>
    </template>

    <div v-else class="state-panel module-placeholder">
      <el-icon><DataAnalysis /></el-icon>
      <h2>{{ activeModule }}</h2>
      <p>Die Desktop-Ansicht fuer dieses Flydeck-Modul folgt nach der DATA-Grundstruktur.</p>
    </div>
  </main>
</template>
