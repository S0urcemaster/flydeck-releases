<script setup lang="ts">
import { markRaw } from "vue";
import { ChatDotRound, Clock, Collection, Grid } from "@element-plus/icons-vue";
import type { ModuleId } from "../ui";

defineProps<{ activeModule: ModuleId }>();
defineEmits<{ select: [module: ModuleId] }>();

const modules = [
  { id: "AGNT" as const, icon: markRaw(ChatDotRound) },
  { id: "DATA" as const, icon: markRaw(Collection) },
  { id: "APPS" as const, icon: markRaw(Grid) },
  { id: "CRON" as const, icon: markRaw(Clock) },
];
</script>

<template>
  <aside class="module-rail" aria-label="Flydeck Module">
    <button
      v-for="module in modules"
      :key="module.id"
      :class="{ active: activeModule === module.id }"
      @click="$emit('select', module.id)"
    >
      <el-icon><component :is="module.icon" /></el-icon>
      <span>{{ module.id }}</span>
    </button>
  </aside>
</template>
