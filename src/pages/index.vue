<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>Electron + Vue + Vuetify Boilerplate</v-card-title>
          <v-card-text>
            <v-btn @click="ping">Ping main process</v-btn>
            <div v-if="pong">Ответ: {{ pong }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue';

const pong = ref('');

function ping() {
  window.electronAPI.ping().then((result) => {
    pong.value = result;
  });
}
</script>
