<script setup lang="ts">
import { DataAnalysis, Share } from "@element-plus/icons-vue";
import type { DesktopAppId } from "../ui";

defineProps<{ activeAppId: DesktopAppId }>();
defineEmits<{ select: [appId: DesktopAppId] }>();
</script>

<template>
  <aside class="navigator apps-navigator">
    <div class="navigator-heading">Apps</div>
    <div class="app-list">
      <button
        type="button"
        :class="{ active: activeAppId === 'data-analysis' }"
        @click="$emit('select', 'data-analysis')"
      >
        <el-icon><DataAnalysis /></el-icon>
        <span><strong>Datenanalyse</strong><small>DATA abstrahieren</small></span>
      </button>
      <button
        type="button"
        :class="{ active: activeAppId === 'mindmap' }"
        @click="$emit('select', 'mindmap')"
      >
        <el-icon><Share /></el-icon>
        <span><strong>Mindmap</strong><small>Branches im Raum</small></span>
      </button>
    </div>
  </aside>
</template>
