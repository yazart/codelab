/** Cancel the browser shortcut, including KeyS on non-Latin keyboard layouts. */
export function preventPageSave(event: Pick<KeyboardEvent, 'ctrlKey' | 'metaKey' | 'altKey' | 'code' | 'key' | 'preventDefault'>): void {
  if ((event.ctrlKey || event.metaKey) && !event.altKey
    && (event.code === 'KeyS' || event.key.toLowerCase() === 's')) {
    event.preventDefault();
  }
}
