<script setup lang="ts">
import AppHeader from "./components/AppHeader.vue";
import AppInspector from "./components/AppInspector.vue";
import AppsNavigator from "./components/AppsNavigator.vue";
import DataNavigator from "./components/DataNavigator.vue";
import DataWorkspace from "./components/DataWorkspace.vue";
import ModuleRail from "./components/ModuleRail.vue";
import NodeInspector from "./components/NodeInspector.vue";
import StatusBar from "./components/StatusBar.vue";
import TimelineWorkspace from "./components/TimelineWorkspace.vue";
import MindmapWorkspace from "./components/MindmapWorkspace.vue";
import { useDataWorkspace } from "./useDataWorkspace";

const workspace = useDataWorkspace();
</script>

<template>
  <div class="desktop-shell">
    <AppHeader
      :error="workspace.error.value"
      :loading="workspace.loading.value"
      :workspace-name="workspace.desktopData.value?.workspace.name"
      @reload="workspace.loadData"
    />

    <div class="workspace">
      <ModuleRail
        :active-module="workspace.activeModule.value"
        @select="workspace.openModule"
      />
      <DataNavigator
        v-if="workspace.activeModule.value !== 'APPS'"
        :active-module="workspace.activeModule.value"
        :loading="workspace.loading.value"
        :data="workspace.navigatorData.value"
        :current-key="workspace.navigatorCurrentKey.value"
        :total-count="workspace.totalCount.value"
        @select="workspace.focusNode"
      />
      <AppsNavigator
        v-else
        :active-app-id="workspace.activeAppId.value"
        @select="workspace.selectApp"
      />
      <DataWorkspace
        v-if="workspace.activeModule.value !== 'APPS'"
        :active-module="workspace.activeModule.value"
        :active-root="workspace.activeRoot.value"
        :section-title="workspace.sectionTitle.value"
        :search="workspace.search.value"
        :visible-count="workspace.visibleCount.value"
        :total-count="workspace.totalCount.value"
        :revision="workspace.desktopData.value?.tree.document.revision"
        :error="workspace.error.value"
        :loading="workspace.loading.value"
        :rows="workspace.filteredRows.value"
        :expanded-row-keys="workspace.expandedRowKeys.value"
        :selected-id="workspace.selectedTableId.value"
        :enabled-saving-ids="workspace.enabledSavingIds.value"
        @update:search="workspace.search.value = $event"
        @update:expanded-row-keys="workspace.expandedRowKeys.value = $event"
        @reload="workspace.loadData"
        @select-row="workspace.selectRow"
        @toggle-enabled="workspace.toggleEnabled"
      />
      <TimelineWorkspace
        v-else-if="workspace.activeAppId.value === 'data-analysis'"
        :rows="workspace.appRows.value"
        :source-path="workspace.appDataSourceText.value"
        :source-label="workspace.appDataSource.value?.label"
        :source-valid="workspace.appDataSourceValid.value"
        :loading="workspace.loading.value"
        :error="workspace.error.value"
      />
      <MindmapWorkspace
        v-else
        :source="workspace.appDataSource.value"
        :source-path="workspace.appDataSourceText.value"
        :source-valid="workspace.appDataSourceValid.value"
        :loading="workspace.loading.value"
        :error="workspace.error.value"
      />
      <NodeInspector
        v-if="workspace.activeModule.value !== 'APPS'"
        :active-module="workspace.activeModule.value"
        :selected="workspace.selected.value"
        :draft="workspace.editorDraft.value"
        :parent-options="workspace.parentOptions.value"
        :content-format="workspace.contentFormat.value"
        :content-loading="workspace.contentLoading.value"
        :content-updated-at="workspace.contentUpdatedAt.value"
        :saving="workspace.editorSaving.value"
        :deleting="workspace.editorDeleting.value"
        :error="workspace.editorError.value"
        @new="workspace.startNew"
        @cancel-new="workspace.cancelNew"
        @save="workspace.saveEditor"
        @delete="workspace.deleteSelected"
        @update-label="workspace.updateEditorLabel"
        @update-local-id="workspace.updateEditorLocalId"
        @update-parent-text="workspace.updateParentText"
        @select-parent="workspace.selectParent"
        @update-content="workspace.updateEditorContent"
      />
      <AppInspector
        v-else
        :data-source-text="workspace.appDataSourceText.value"
        :data-source-valid="workspace.appDataSourceValid.value"
        :data-source-options="workspace.appDataSourceOptions.value"
        :app-id="workspace.activeAppId.value"
        :visualization="workspace.appVisualization.value"
        :item-count="workspace.appRows.value.length"
        @update:data-source-text="workspace.updateAppDataSourceText"
        @select:data-source="workspace.selectAppDataSource"
        @update:visualization="workspace.updateAppVisualization"
      />
    </div>

    <StatusBar
      :workspace-name="workspace.desktopData.value?.workspace.name"
      :total-count="workspace.totalCount.value"
      :load-duration-ms="workspace.loadDurationMs.value"
      :focus-duration-ms="workspace.focusDurationMs.value"
      :loading="workspace.loading.value"
      :error="workspace.error.value"
    />
  </div>
</template>
