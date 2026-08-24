<script setup lang="ts">
import { MoreFilled, Refresh, Setting } from "@element-plus/icons-vue";

defineProps<{
  error: string;
  loading: boolean;
  workspaceName?: string;
}>();

defineEmits<{ reload: [] }>();
</script>

<template>
  <header class="titlebar">
    <div class="brand-mark">𐦍</div>
    <div class="brand-copy"><strong>Flydeck</strong><span>Desktop V2</span></div>
    <div class="connection-pill" :class="{ offline: Boolean(error) }">
      <span class="connection-dot" />
      {{ error ? "API nicht erreichbar" : `Local API · ${workspaceName ?? "…"}` }}
    </div>
    <el-button :icon="Refresh" text :loading="loading" @click="$emit('reload')">
      <span class="button-label">Neu laden</span>
    </el-button>
    <el-button :icon="Setting" text aria-label="Einstellungen" />
    <el-button :icon="MoreFilled" text aria-label="Mehr" />
  </header>
</template>
