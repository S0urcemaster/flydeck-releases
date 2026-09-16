<script setup lang="ts">
import { onMounted, ref } from "vue";
import { decideExchangeRequest, deleteExchangeRequest, disconnectRelay, loadExchangeInbox,
  loadRelayConnections, sendExchangeRequest, type ExchangeInboxItem } from "../api";

const inbox = ref<ExchangeInboxItem[]>([]);
const connections = ref<Array<{ id: string; peerTitle: string; peerOrigin: string }>>([]);
const origin = ref("");
const error = ref("");
const loading = ref(false);

async function reload() {
  loading.value = true; error.value = "";
  try { [inbox.value, connections.value] = await Promise.all([loadExchangeInbox(), loadRelayConnections()]); }
  catch (value) { error.value = value instanceof Error ? value.message : String(value); }
  finally { loading.value = false; }
}
async function act(operation: () => Promise<unknown>) {
  try { error.value = ""; await operation(); await reload(); }
  catch (value) { error.value = value instanceof Error ? value.message : String(value); }
}
onMounted(reload);
</script>

<template>
  <main class="data-workspace relay-workspace">
    <header class="workspace-header"><h1>Relay connections</h1></header>
    <el-alert v-if="error" :title="error" type="error" show-icon />
    <section>
      <h2>Exchange request</h2>
      <div class="relay-request-form">
        <el-input v-model="origin" placeholder="https://relay-two.relay-one.de" />
        <el-button :disabled="!origin" @click="act(() => sendExchangeRequest(origin))">Send</el-button>
      </div>
    </section>
    <section><h2>Inbox</h2>
      <el-empty v-if="!inbox.length && !loading" description="No exchange requests" />
      <el-card v-for="item in inbox" :key="item.id">
        <strong>{{ item.peerTitle }}</strong><p>{{ item.peerOrigin }} · {{ item.status }}</p>
        <el-button v-if="item.status === 'pending'" type="success" @click="act(() => decideExchangeRequest(item.id, 'accept'))">Accept</el-button>
        <el-button v-if="item.status === 'pending'" @click="act(() => decideExchangeRequest(item.id, 'reject'))">Reject</el-button>
        <el-button type="danger" plain @click="act(() => deleteExchangeRequest(item.id))">Delete</el-button>
      </el-card>
    </section>
    <section><h2>Connected relays</h2>
      <el-card v-for="peer in connections" :key="peer.id"><strong>{{ peer.peerTitle }}</strong><p>{{ peer.peerOrigin }}</p>
        <el-button type="danger" plain @click="act(() => disconnectRelay(peer.id))">Disconnect</el-button>
      </el-card>
    </section>
  </main>
</template>
