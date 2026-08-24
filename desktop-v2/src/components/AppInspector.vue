<script setup lang="ts">
import { computed } from "vue";
import { DataAnalysis, Share } from "@element-plus/icons-vue";
import type { AppVisualization, DesktopAppId, ParentOption } from "../ui";

const props = defineProps<{
  appId: DesktopAppId;
  dataSourceText: string;
  dataSourceValid: boolean;
  dataSourceOptions: ParentOption[];
  visualization: AppVisualization;
  itemCount: number;
}>();

const appMeta = computed(() => props.appId === "mindmap"
  ? {
      name: "Mindmap",
      description: "Ein Startknoten mit radial verteilten Branches.",
      icon: Share,
      visualizationLabel: "Mindmap",
    }
  : {
      name: "Datenanalyse",
      description: "Eine DATA-Quelle, verschiedene Abstraktionen.",
      icon: DataAnalysis,
      visualizationLabel: "Zeitachse",
    });

defineEmits<{
  "update:data-source-text": [value: string];
  "select:data-source": [option: ParentOption];
  "update:visualization": [value: AppVisualization];
}>();

function queryDataSources(
  query: string,
  callback: (items: Array<ParentOption & { value: string }>) => void,
) {
  const normalized = query.trim().toLocaleLowerCase("de");
  callback(props.dataSourceOptions
    .filter(({ label }) => !normalized || label.toLocaleLowerCase("de").includes(normalized))
    .slice(0, 40)
    .map((option) => ({ ...option, value: option.label })));
}
</script>

<template>
  <aside class="inspector app-inspector">
    <div class="inspector-heading"><span>App-Steuerung</span></div>
    <div class="selected-icon"><el-icon><component :is="appMeta.icon" /></el-icon></div>
    <h2>{{ appMeta.name }}</h2>
    <div class="path-copy">{{ appMeta.description }}</div>

    <el-form class="app-control-form" label-position="top" @submit.prevent>
      <el-form-item label="Data Source · Pfad aus IDs">
        <el-autocomplete
          :model-value="dataSourceText"
          :fetch-suggestions="queryDataSources"
          :class="['data-source-input', dataSourceValid ? 'is-valid' : 'is-invalid']"
          clearable
          placeholder="zum/beispiel/lager"
          @update:model-value="$emit('update:data-source-text', $event)"
          @select="$emit('select:data-source', { id: $event.id, label: $event.label })"
        />
      </el-form-item>
      <el-form-item label="Darstellung">
        <el-select
          :model-value="visualization"
          @update:model-value="$emit('update:visualization', $event)"
        >
          <el-option :label="appMeta.visualizationLabel" :value="visualization" />
        </el-select>
      </el-form-item>
    </el-form>

    <div class="property-grid app-properties">
      <span>Status</span><strong>{{ dataSourceValid ? "Verbunden" : "Pfad wählen" }}</strong>
      <span>Datensätze</span><strong>{{ dataSourceValid ? itemCount : "–" }}</strong>
      <span>Abstraktion</span><strong>{{ appMeta.visualizationLabel }}</strong>
    </div>
  </aside>
</template>
