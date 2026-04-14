<template>
  <q-avatar :style="{ 'background-color': bgColor }" :text-color="textColor">
    <q-img v-if="src.length" alt="avatar image" :src="src" />
    <span v-else-if="firstLetter">{{ firstLetter }}</span>
    <q-icon v-else name="sym_o_person" />
  </q-avatar>
</template>
<script setup>
import { useQuasar } from 'quasar'
import { computed } from 'vue'

const $q = useQuasar()
const props = defineProps({
  src: {
    type: String,
    default: '',
  },
  name: {
    type: String,
    default: '',
  },
  asset: {
    type: String,
    default: '',
  },
  gray: {
    type: Boolean,
    default: false,
  },
})

const stringToHslColor = (str, s, l) => {
  const letters = Array.from(str ?? '')

  /* converts the given string (the user name) to a numeric hash getting the Unicode value from each character in the string. */
  const hash = letters?.reduce(
    (hash, letter) => letter.charCodeAt(0) + ((hash << 5) - hash),
    0,
  )
  /* converts the returned hash to a number between 0 and 360 with modulus javascript function */
  const h = hash % 360
  return 'hsl(' + h + ', ' + s + '%, ' + l + '%)'
}

const textColor = computed(() => ($q.dark.isActive ? 'black' : 'white'))
const firstLetter = computed(() => props.name?.charAt(0).toUpperCase())

const bgColor = computed(() =>
  props.src
    ? 'transparent'
    : props.gray
      ? '#5F6971'
      : stringToHslColor(props.name, 50, $q.dark.isActive ? 70 : 30),
)
</script>
