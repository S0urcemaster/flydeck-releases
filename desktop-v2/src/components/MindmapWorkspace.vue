<script setup lang="ts">
import { computed } from "vue";
import { Share } from "@element-plus/icons-vue";
import type { TreeRow } from "../api";

const props = defineProps<{
  source: TreeRow | null;
  sourcePath: string;
  sourceValid: boolean;
  loading: boolean;
  error: string;
}>();

type PositionedBranch = {
  row: TreeRow;
  x: number;
  y: number;
  ring: number;
};

const layout = computed(() => {
  const rows = props.source?.children ?? [];
  const positioned: PositionedBranch[] = [];
  let offset = 0;
  let ring = 0;
  let outerRadius = 0;
  while (offset < rows.length) {
    const capacity = 8 + ring * 6;
    const ringRows = rows.slice(offset, offset + capacity);
    const radius = 13 + ring * 10;
    outerRadius = radius;
    ringRows.forEach((row, index) => {
      const angle = -Math.PI / 2
        + (index / ringRows.length) * Math.PI * 2
        + (ring % 2 ? Math.PI / ringRows.length : 0);
      positioned.push({
        row,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        ring,
      });
    });
    offset += ringRows.length;
    ring += 1;
  }
  const radius = Math.max(19, outerRadius + 8);
  const size = radius * 2;
  return {
    branches: positioned.map((branch) => ({
      ...branch,
      x: branch.x + radius,
      y: branch.y + radius,
    })),
    center: radius,
    size,
  };
});
</script>

<template>
  <main class="content-panel mindmap-workspace">
    <section class="content-heading">
      <div class="content-title">
        <div class="eyebrow">Home / APPS / Mindmap</div>
        <h1>Mindmap</h1>
      </div>
      <div v-if="sourceValid" class="timeline-source-pill">
        <el-icon><Share /></el-icon><span>{{ sourcePath }}</span>
      </div>
    </section>

    <div class="view-tabs">
      <strong>Mindmap</strong>
      <span v-if="sourceValid">{{ source?.children.length ?? 0 }} Branches · {{ source?.descendantCount ?? 0 }} Unterknoten</span>
    </div>

    <div v-if="error" class="state-panel error-state">
      <strong>DATA konnte nicht geladen werden</strong><span>{{ error }}</span>
    </div>
    <div v-else-if="!sourceValid || !source" class="state-panel timeline-empty">
      <el-icon><Share /></el-icon>
      <h2>Startknoten wählen</h2>
      <p>Trage rechts im Inspector einen Pfad aus DATA-IDs ein.</p>
    </div>
    <div v-else class="mindmap-scroll" v-loading="loading">
      <div
        class="mindmap-stage"
        :style="{ width: `${layout.size}rem`, height: `${layout.size}rem` }"
      >
        <svg
          class="mindmap-links"
          :viewBox="`0 0 ${layout.size} ${layout.size}`"
          aria-hidden="true"
        >
          <line
            v-for="branch in layout.branches"
            :key="branch.row.id"
            :x1="layout.center"
            :y1="layout.center"
            :x2="branch.x"
            :y2="branch.y"
          />
        </svg>

        <article
          class="mindmap-node mindmap-root-node"
          :style="{ left: `${layout.center}rem`, top: `${layout.center}rem` }"
        >
          <small>Startknoten</small>
          <strong>{{ source.label }}</strong>
          <span>{{ source.localId }}</span>
        </article>

        <article
          v-for="branch in layout.branches"
          :key="branch.row.id"
          class="mindmap-node mindmap-branch-node"
          :class="`ring-${branch.ring % 3}`"
          :style="{ left: `${branch.x}rem`, top: `${branch.y}rem` }"
        >
          <strong>{{ branch.row.label }}</strong>
          <span>{{ branch.row.localId }}</span>
          <small>{{ branch.row.descendantCount }} Unterknoten</small>
          <div v-if="branch.row.children.length" class="mindmap-child-preview">
            <i v-for="child in branch.row.children.slice(0, 3)" :key="child.id">{{ child.label }}</i>
            <i v-if="branch.row.children.length > 3">+{{ branch.row.children.length - 3 }}</i>
          </div>
        </article>
      </div>
    </div>
  </main>
</template>
