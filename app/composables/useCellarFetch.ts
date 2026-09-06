/** Bind writes to the cellar displayed when the form was opened, including across tabs. */
export function useCellarFetch() {
  const id = useAuth().current.value?.pivnica.id
  return $fetch.create({ headers: id ? { 'X-Cellar-Id': id } : {} })
}
