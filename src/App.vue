<script setup lang="ts">
import { BingButton } from './components'
</script>

<template>
  <main class="demo-shell">
    <section class="demo-panel">
      <p class="eyebrow">Bing UI</p>
      <h1>Motion-first Vue components.</h1>
      <p class="intro">
        A starter surface for shaping your own animated component language.
      </p>

      <div class="demo-actions">
        <BingButton>Primary action</BingButton>
        <BingButton variant="secondary" rounded="lg">Secondary</BingButton>
        <BingButton variant="ghost">Plain ghost</BingButton>
      </div>
    </section>
  </main>
</template>
