/// <reference lib="dom" />
import { expect } from 'vitest'

export function captureClickBurst() {
  const layer = [...document.querySelectorAll<HTMLElement>('.bing-click-particles')].at(-1)!
  expect(layer).toBeDefined()
  const shards = [...layer.querySelectorAll<HTMLElement>('.bing-click-particles__shard')]
  const animations = shards.flatMap(shard => shard.getAnimations())
  expect(animations).toHaveLength(shards.length)
  for (const animation of animations) animation.pause()
  return {
    layer, shards, animations,
    seek(time: number) { for (const animation of animations) animation.currentTime = time },
    async finish() {
      for (const animation of animations) animation.finish()
      await Promise.all(animations.map(animation => animation.finished))
      await Promise.resolve()
    },
  }
}
