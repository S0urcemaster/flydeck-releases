<script setup lang="ts">
import { Aim, Connection } from "@element-plus/icons-vue";
import { nextTick, ref, watch } from "vue";
import type { TreeV2Instance } from "element-plus";
import type { ModuleId, NavigatorRow } from "../ui";
import { nodeIcon } from "../ui";

const props = defineProps<{
  activeModule: ModuleId;
  loading: boolean;
  data: NavigatorRow[];
  currentKey: string;
  totalCount: number;
}>();

defineEmits<{ select: [row: NavigatorRow] }>();

const DATA_ROOT_ID = "__data_root__";
const defaultExpandedKeys = [DATA_ROOT_ID];
const treeProps = { value: "id", label: "label", children: "children" };
const treeRef = ref<TreeV2Instance>();

watch(
  () => [props.currentKey, props.data] as const,
  async ([currentKey]) => {
    await nextTick();
    const path = findNavigatorPath(props.data, currentKey);
    for (const row of path.slice(0, -1)) {
      const node = treeRef.value?.getNode(row.id);
      if (node && !node.expanded) treeRef.value?.expandNode(node);
    }
    await nextTick();
    treeRef.value?.scrollToNode(currentKey, "auto");
  },
  { immediate: true },
);

function findNavigatorPath(rows: NavigatorRow[], id: string): NavigatorRow[] {
  for (const row of rows) {
    if (row.id === id) return [row];
    const childPath = findNavigatorPath(row.children, id);
    if (childPath.length) return [row, ...childPath];
  }
  return [];
}
</script>

<template>
  <aside class="navigator">
    <template v-if="activeModule === 'DATA'">
      <div class="navigator-heading">Datenquellen</div>
      <div class="navigator-tree" v-loading="loading">
        <el-auto-resizer>
          <template #default="{ height, width }">
            <el-tree-v2
              ref="treeRef"
              :data="data"
              :height="height"
              :style="{ width: `${width}px` }"
              :props="treeProps"
              :current-node-key="currentKey"
              :default-expanded-keys="defaultExpandedKeys"
              :item-size="32"
              :expand-on-click-node="false"
              highlight-current
              scrollbar-always-on
              @node-click="$emit('select', $event)"
            >
              <template #default="{ data: row }">
                <span class="navigator-node">
                  <el-icon><component :is="nodeIcon(row)" /></el-icon>
                  <span>{{ row.label }}</span>
                  <small>{{ row.synthetic ? row.children.length : row.descendantCount || '' }}</small>
                </span>
              </template>
            </el-tree-v2>
          </template>
        </el-auto-resizer>
      </div>
      <div class="source-card">
        <el-icon><Connection /></el-icon>
        <div><strong>Flydeck V2 API</strong><span>PostgreSQL lokal · {{ totalCount }} Knoten</span></div>
      </div>
    </template>

    <template v-else>
      <div class="navigator-heading">Modul</div>
      <div class="future-module">
        <el-icon><Aim /></el-icon>
        <strong>{{ activeModule }}</strong>
        <span>Dieses Modul wird nach DATA ausgearbeitet.</span>
      </div>
    </template>
  </aside>
</template>
