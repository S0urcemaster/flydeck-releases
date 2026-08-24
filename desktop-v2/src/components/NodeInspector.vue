<script setup lang="ts">
import { Plus } from "@element-plus/icons-vue";
import type { TreeRow } from "../api";
import type { InspectorDraft, ModuleId, ParentOption } from "../ui";
import { nodeIcon } from "../ui";
import ArmDeleteButton from "./ArmDeleteButton.vue";

const props = defineProps<{
  activeModule: ModuleId;
  selected: TreeRow | null;
  draft: InspectorDraft | null;
  parentOptions: ParentOption[];
  contentFormat: string;
  contentLoading: boolean;
  contentUpdatedAt: string;
  saving: boolean;
  deleting: boolean;
  error: string;
}>();

defineEmits<{
  new: [];
  cancelNew: [];
  save: [];
  delete: [];
  updateLabel: [value: string];
  updateLocalId: [value: string];
  updateParentText: [value: string];
  selectParent: [option: ParentOption];
  updateContent: [value: string];
}>();

function queryParents(query: string, callback: (items: Array<ParentOption & { value: string }>) => void) {
  const normalized = query.trim().toLocaleLowerCase("de");
  callback(props.parentOptions
    .filter((option) => !normalized || option.label.toLocaleLowerCase("de").includes(normalized))
    .slice(0, 30)
    .map((option) => ({ ...option, value: option.label })));
}

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "Europe/Berlin",
});

function formatTimestamp(value?: string) {
  if (!value) return "–";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "–" : dateFormatter.format(date);
}
</script>

<template>
  <aside class="inspector">
    <div class="inspector-heading">
      <span>Inspector</span>
      <div class="inspector-heading-actions">
        <ArmDeleteButton
          :label="selected?.label ?? ''"
          :disabled="!selected || draft?.mode === 'new' || selected.kind === 'system-directory' || selected.kind === 'trash-directory'"
          :pending="deleting"
          @confirm="$emit('delete')"
        />
        <el-button :icon="Plus" type="primary" @click="$emit('new')">New</el-button>
      </div>
    </div>

    <template v-if="activeModule === 'DATA' && draft">
      <div v-if="draft.mode === 'edit' && selected" class="selected-icon">
        <el-icon><component :is="nodeIcon(selected)" /></el-icon>
      </div>
      <div v-else class="draft-icon"><el-icon><Plus /></el-icon></div>
      <h2>{{ draft.mode === "new" ? "Neues Item" : selected?.label }}</h2>
      <div class="path-copy">
        {{ draft.mode === "new" ? "Noch nicht gespeichert" : selected?.path.join("/") }}
      </div>

      <el-form class="node-form" label-position="top" @submit.prevent>
        <el-form-item class="name-field" label="Name">
          <el-input
            :model-value="draft.label"
            maxlength="200"
            placeholder="Name"
            @update:model-value="$emit('updateLabel', $event)"
          />
        </el-form-item>
        <el-form-item class="id-field" label="ID">
          <el-input
            :model-value="draft.localId"
            placeholder="id"
            @update:model-value="$emit('updateLocalId', $event)"
          />
        </el-form-item>
        <el-form-item class="parent-field" label="Parent">
          <el-autocomplete
            :model-value="draft.parentText"
            :fetch-suggestions="queryParents"
            :class="['parent-input', draft.parentValid ? 'is-valid' : 'is-invalid']"
            placeholder="Root (leer) oder pfad/zum/parent"
            @update:model-value="$emit('updateParentText', $event)"
            @select="$emit('selectParent', { id: $event.id, label: $event.label })"
          />
        </el-form-item>
        <el-form-item class="content-field" :label="`Content · ${contentFormat || 'markdown'}`">
          <el-input
            :model-value="draft.content"
            v-loading="contentLoading"
            type="textarea"
            :rows="8"
            resize="vertical"
            :disabled="draft.mode === 'edit' && selected?.capabilities.contentEditable === false"
            maxlength="1000000"
            placeholder="Content"
            @update:model-value="$emit('updateContent', $event)"
          />
        </el-form-item>
        <div v-if="error" class="editor-error">{{ error }}</div>
        <div class="editor-actions">
          <el-button v-if="draft.mode === 'new'" @click="$emit('cancelNew')">Abbrechen</el-button>
          <el-button type="primary" :loading="saving" @click="$emit('save')">Save</el-button>
        </div>
      </el-form>

      <template v-if="draft.mode === 'edit' && selected">
        <div class="property-grid">
          <span>Typ</span><strong>{{ selected.kind }}</strong>
          <span>Unterknoten</span><strong>{{ selected.descendantCount }}</strong>
          <span>Revision</span><strong>{{ selected.revision }}</strong>
          <span>Aktiv</span><strong>{{ selected.enabled ? "Ja" : "Nein" }}</strong>
          <span>Erstellt</span><strong>{{ formatTimestamp(selected.createdAt) }}</strong>
          <span>Knoten geändert</span><strong>{{ formatTimestamp(selected.updatedAt) }}</strong>
          <span>Inhalt geändert</span><strong>{{ formatTimestamp(contentUpdatedAt) }}</strong>
        </div>
      </template>
    </template>
    <div v-else class="empty-inspector">Waehle einen DATA-Knoten aus.</div>
  </aside>
</template>
