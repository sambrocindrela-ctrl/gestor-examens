<template>
  <q-btn flat>
    <B3AvatarImage :src="profile?.image" />
    <q-menu transition-show="flip-left" transition-hide="flip-right">
      <q-list>
        <q-item>
          <q-item-section avatar>
            <B3AvatarImage rounded :src="profile?.image" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-h6" style="white-space: nowrap">{{
              profile?.name
              }}</q-item-label>
            <q-item-label caption>{{
              profile?.preferred_username
              }}</q-item-label>
          </q-item-section>
        </q-item>
        <q-separator />

        <q-item v-ripple clickable @click="logout()">
          <q-item-section avatar>
            <q-icon color="grey-8" name="sym_o_power_settings_new" />
          </q-item-section>
          <q-item-section>Sortir</q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-btn>
</template>

<script setup>
import B3AvatarImage from './B3/B3AvatarImage.vue'

const keycloak = useNuxtApp().$keycloak
const profile = keycloak?.tokenParsed ?? {}

const logout = async () => {
  keycloak.logout()
}
</script>

<style scoped></style>
