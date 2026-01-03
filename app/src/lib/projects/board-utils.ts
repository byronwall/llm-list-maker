export function isLoose(listId: string | null) {
  return listId == null;
}

export function listKey(listId: string | null) {
  return listId ?? "LOOSE";
}
