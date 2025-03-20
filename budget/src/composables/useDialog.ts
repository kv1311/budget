import { ref } from 'vue'

export function useDialog() {
  const showDialog = ref(false)

  const openDialog = () => {
    showDialog.value = true
  }

  const closeDialog = () => {
    showDialog.value = false
  }

  return {
    showDialog,
    openDialog,
    closeDialog
  }
}
