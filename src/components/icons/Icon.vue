<script setup lang="ts">
import { icons } from './index'

const props = defineProps<{
  name: keyof typeof icons
  size?: number
  class?: string
}>()
</script>

<template>
  <span 
    class="inline-flex items-center justify-center" 
    :class="props.class"
    v-html="icons[props.name]"
  />
</template>
