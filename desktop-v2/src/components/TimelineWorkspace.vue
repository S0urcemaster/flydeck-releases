<script setup lang="ts">
import { computed } from "vue";
import { Clock, DataAnalysis } from "@element-plus/icons-vue";
import type { TreeRow } from "../api";

const props = defineProps<{
  rows: TreeRow[];
  sourcePath: string;
  sourceLabel?: string;
  sourceValid: boolean;
  loading: boolean;
  error: string;
}>();

type TimelineGroup = {
  timestamp: number;
  position: number;
  lane: number;
  rows: TreeRow[];
};

const timestampedRows = computed(() => props.rows
  .map((row) => ({ row, timestamp: timestamp(row.createdAt) }))
  .filter((entry): entry is { row: TreeRow; timestamp: number } => entry.timestamp !== null)
  .sort((left, right) => left.timestamp - right.timestamp));

const range = computed(() => {
  const entries = timestampedRows.value;
  if (!entries.length) return null;
  const start = entries[0].timestamp;
  const end = entries.at(-1)!.timestamp;
  return { start, end, duration: Math.max(1, end - start) };
});

const groups = computed<TimelineGroup[]>(() => {
  const currentRange = range.value;
  if (!currentRange) return [];
  const byTimestamp = new Map<number, TreeRow[]>();
  for (const entry of timestampedRows.value) {
    const rows = byTimestamp.get(entry.timestamp) ?? [];
    rows.push(entry.row);
    byTimestamp.set(entry.timestamp, rows);
  }
  let previousPosition = -100;
  let lane = 0;
  return [...byTimestamp.entries()].map(([time, rows]) => {
    const position = currentRange.start === currentRange.end
      ? 50
      : 4 + ((time - currentRange.start) / currentRange.duration) * 92;
    lane = position - previousPosition < 7 ? (lane + 1) % 2 : 0;
    previousPosition = position;
    return { timestamp: time, position, lane, rows };
  });
});

const stageHeight = computed(() => `${Math.max(34, Math.min(160, groups.value.length * 5.5))}rem`);
const ticks = computed(() => {
  const currentRange = range.value;
  if (!currentRange) return [];
  return Array.from({ length: 6 }, (_, index) => {
    const ratio = index / 5;
    return {
      position: 4 + ratio * 92,
      timestamp: currentRange.start + currentRange.duration * ratio,
    };
  });
});

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "Europe/Berlin",
});

function timestamp(value?: string): number | null {
  if (!value) return null;
  const result = new Date(value).getTime();
  return Number.isNaN(result) ? null : result;
}

function formatDate(value: number) {
  return dateFormatter.format(new Date(value));
}
</script>

<template>
  <main class="content-panel timeline-workspace">
    <section class="content-heading">
      <div class="content-title">
        <div class="eyebrow">Home / APPS / Datenanalyse</div>
        <h1>Zeitachse</h1>
      </div>
      <div v-if="sourceValid" class="timeline-source-pill">
        <el-icon><DataAnalysis /></el-icon><span>{{ sourcePath }}</span>
      </div>
    </section>

    <div class="view-tabs">
      <strong>Zeitachse</strong>
      <span v-if="sourceValid">{{ timestampedRows.length }} Zeitpunkte · {{ rows.length }} Datensätze</span>
    </div>

    <div v-if="error" class="state-panel error-state">
      <strong>DATA konnte nicht geladen werden</strong><span>{{ error }}</span>
    </div>
    <div v-else-if="!sourceValid" class="state-panel timeline-empty">
      <el-icon><DataAnalysis /></el-icon>
      <h2>Data Source wählen</h2>
      <p>Trage rechts im Inspector einen Pfad aus DATA-IDs ein.</p>
    </div>
    <div v-else-if="!groups.length" class="state-panel timeline-empty">
      <el-icon><Clock /></el-icon>
      <h2>Keine Zeitstempel</h2>
      <p>Unter {{ sourceLabel || sourcePath }} wurden keine gespeicherten Erstellungszeiten gefunden.</p>
    </div>
    <div v-else class="timeline-scroll" v-loading="loading">
      <div class="timeline-stage" :style="{ height: stageHeight }">
        <div class="timeline-axis" />
        <div
          v-for="tick in ticks"
          :key="tick.position"
          class="timeline-tick"
          :style="{ top: `${tick.position}%` }"
        >
          <time>{{ formatDate(tick.timestamp) }}</time><i />
        </div>
        <article
          v-for="group in groups"
          :key="group.timestamp"
          class="timeline-event"
          :class="`lane-${group.lane}`"
          :style="{ top: `${group.position}%` }"
        >
          <span class="timeline-marker" />
          <div class="timeline-card">
            <time>{{ formatDate(group.timestamp) }}</time>
            <strong v-for="row in group.rows.slice(0, 4)" :key="row.id">{{ row.label }}</strong>
            <small v-if="group.rows.length > 4">+ {{ group.rows.length - 4 }} weitere</small>
          </div>
        </article>
      </div>
    </div>
  </main>
</template>
