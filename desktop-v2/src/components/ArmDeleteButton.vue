<script setup lang="ts">
import { Delete } from "@element-plus/icons-vue";
import { onBeforeUnmount, ref, watch } from "vue";

const props = defineProps<{
  label: string;
  disabled?: boolean;
  pending?: boolean;
}>();

const emit = defineEmits<{ confirm: [] }>();
const armed = ref(false);
let resetTimer: ReturnType<typeof setTimeout> | null = null;

watch(() => [props.label, props.disabled] as const, reset);
onBeforeUnmount(clearResetTimer);

function click() {
  if (props.disabled || props.pending) return;
  if (armed.value) {
    reset();
    emit("confirm");
    return;
  }
  armed.value = true;
  resetTimer = setTimeout(reset, 500);
}

function reset() {
  clearResetTimer();
  armed.value = false;
}

function clearResetTimer() {
  if (resetTimer) clearTimeout(resetTimer);
  resetTimer = null;
}
</script>

<template>
  <el-button
    :type="armed ? 'danger' : undefined"
    :icon="Delete"
    :disabled="disabled || pending"
    :loading="pending"
    :aria-label="armed ? `Löschen bestätigen: ${label}` : `Löschen aktivieren: ${label}`"
    :title="armed ? 'Noch einmal drücken zum Löschen' : 'Löschen aktivieren'"
    @click="click"
  />
</template>
