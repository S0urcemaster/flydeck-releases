<script setup lang="ts">
import { computed, h, nextTick, ref, watch } from "vue";
import {
  ElCheckbox,
  ElIcon,
  type Column,
  type RowEventHandlers,
  type TableV2Instance,
} from "element-plus";
import type { TreeRow } from "../api";
import { nodeIcon } from "../ui";

const props = defineProps<{
  width: number;
  height: number;
  rows: TreeRow[];
  expandedRowKeys: Array<string | number>;
  selectedId?: string;
  enabledSavingIds: string[];
}>();

const emit = defineEmits<{
  "update:expandedRowKeys": [value: Array<string | number>];
  selectRow: [row: TreeRow];
  toggleEnabled: [row: TreeRow, enabled: boolean];
}>();

type ColumnName = "label" | "localId" | "kind" | "descendantCount" | "revision" | "enabled";
type ColumnLayout = { name: ColumnName; share: number };

const columns = computed(() => createColumns(props.width));
const tableRef = ref<TableV2Instance>();
const rowEventHandlers: RowEventHandlers = {
  onClick: ({ rowData }) => emit("selectRow", rowData as TreeRow),
};

watch(() => props.selectedId, async (selectedId) => {
  if (!selectedId) return;
  await nextTick();
  const index = flattenVisibleRows(props.rows, new Set(props.expandedRowKeys))
    .findIndex((row) => row.id === selectedId);
  if (index >= 0) tableRef.value?.scrollToRow(index, "center");
});

function createColumns(containerWidth: number): Column<unknown>[] {
  const availableWidth = Math.max(1, Math.floor(containerWidth) - 2);
  const layout: ColumnLayout[] = availableWidth >= 560
    ? [
        { name: "label", share: .3 },
        { name: "localId", share: .18 },
        { name: "kind", share: .2 },
        { name: "descendantCount", share: .14 },
        { name: "revision", share: .09 },
        { name: "enabled", share: .09 },
      ]
    : availableWidth >= 390
        ? [
            { name: "label", share: .48 },
            { name: "localId", share: .25 },
            { name: "kind", share: .27 },
          ]
        : [
            { name: "label", share: .65 },
            { name: "localId", share: .35 },
          ];

  let assignedWidth = 0;
  return layout.map((entry, index) => {
    const width = index === layout.length - 1
      ? availableWidth - assignedWidth
      : Math.floor(availableWidth * entry.share);
    assignedWidth += width;
    return column(entry.name, width);
  });
}

function column(name: ColumnName, width: number): Column<unknown> {
  if (name === "label") {
    return {
      key: name,
      dataKey: name,
      title: "Name",
      width,
      cellRenderer: ({ rowData }) => h("div", { class: ["name-cell", { "draft-name": rowData.draft }] }, [
        h("span", { class: "kind-icon" }, [h(ElIcon, null, { default: () => h(nodeIcon(rowData)) })]),
        h("strong", rowData.label || (rowData.draft ? "Neues Item" : "")),
      ]),
    };
  }
  if (name === "enabled") {
    return {
      key: name,
      dataKey: name,
      title: "Aktiv",
      width,
      align: "center",
      cellRenderer: ({ rowData }) => h(ElCheckbox, {
        modelValue: rowData.enabled,
        disabled: rowData.draft || props.enabledSavingIds.includes(rowData.id),
        "onUpdate:modelValue": (value: string | number | boolean) => {
          emit("toggleEnabled", rowData as TreeRow, Boolean(value));
        },
        onClick: (event: MouseEvent) => event.stopPropagation(),
      }),
    };
  }
  const definitions = {
    localId: { title: "ID", align: "left" as const },
    kind: { title: "Typ", align: "left" as const },
    descendantCount: { title: "Unterknoten", align: "right" as const },
    revision: { title: "Rev.", align: "right" as const },
  };
  return {
    key: name,
    dataKey: name,
    title: definitions[name].title,
    width,
    align: definitions[name].align,
  };
}

function tableRowClass({ rowData }: { rowData: TreeRow }) {
  return [
    rowData.id === props.selectedId ? "is-selected" : "",
    rowData.draft ? "is-draft" : "",
  ].filter(Boolean).join(" ");
}

function flattenVisibleRows(rows: TreeRow[], expanded: Set<string | number>): TreeRow[] {
  return rows.flatMap((row) => [
    row,
    ...(expanded.has(row.id) ? flattenVisibleRows(row.children, expanded) : []),
  ]);
}
</script>

<template>
  <el-table-v2
    ref="tableRef"
    :columns="columns"
    :data="rows"
    :width="width"
    :height="height"
    :row-height="40"
    :header-height="36"
    row-key="id"
    expand-column-key="label"
    :expanded-row-keys="expandedRowKeys"
    :row-event-handlers="rowEventHandlers"
    :row-class="tableRowClass"
    scrollbar-always-on
    @expanded-rows-change="$emit('update:expandedRowKeys', $event)"
  />
</template>
