import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type { BingTableProps } from '../BingTable.types'

type LoadingProps = Required<Pick<BingTableProps, 'data' | 'loading'>> & Pick<BingTableProps, 'total'>

export function useTableLoading(props: LoadingProps) {
  const loadingDelay = 150

  const loadingMinimumDuration = 250

  const isLoadingVisible = ref(false)

  const isBusy = computed(() => props.loading || isLoadingVisible.value)

  const settledData = shallowRef(props.data)

  const settledTotal = ref(props.total)

  const displayedData = computed(() => isBusy.value ? settledData.value : props.data)

  let loadingTimer: ReturnType<typeof setTimeout> | undefined

  let loadingShownAt = 0

  function syncLoadingIndicator(loading: boolean) {
    clearTimeout(loadingTimer)
    loadingTimer = undefined

    if (loading) {
      if (!isLoadingVisible.value) {
        loadingTimer = setTimeout(() => {
          loadingTimer = undefined
          loadingShownAt = Date.now()
          isLoadingVisible.value = true
        }, loadingDelay)
      }
      return
    }

    const remaining = loadingMinimumDuration - (Date.now() - loadingShownAt)
    if (isLoadingVisible.value && remaining > 0) {
      loadingTimer = setTimeout(() => {
        loadingTimer = undefined
        isLoadingVisible.value = false
      }, remaining)
    } else {
      isLoadingVisible.value = false
    }
  }

  watch(
    () => [isBusy.value, props.data, props.total] as const,
    ([busy, data, total]) => {
      if (!busy) {
        settledData.value = data
        settledTotal.value = total
      }
    },
  )
  onMounted(() => {
    watch(() => props.loading, syncLoadingIndicator, { immediate: true })
  })
  onBeforeUnmount(() => clearTimeout(loadingTimer))
  return {
    isLoadingVisible, isBusy, settledData, settledTotal, displayedData,
  }
}
