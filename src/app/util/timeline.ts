export function findInsertIndex<T extends object, Key extends ExtractKeysOfType<T, number>>(
  value: number,
  array: T[],
  sortableKey: Key,
): [number, boolean] | undefined {
  const insertIndex = 0;
  const arrayLength = array.length;

  const itemSortableKeyValue = value as T[Key];
  const firstItem = array?.[0];
  const firstItemSortableKeyValue = firstItem?.[sortableKey];

  if (arrayLength === 0 || itemSortableKeyValue === firstItemSortableKeyValue) {
    return [insertIndex, true];
  }

  const isBeforeFirstItem = itemSortableKeyValue < firstItemSortableKeyValue;
  if (isBeforeFirstItem) {
    return [insertIndex, false];
  }
  const lastItem = array[arrayLength - 1];
  const lastItemSortableKeyValue = lastItem?.[sortableKey];
  const isAfterLastItem = itemSortableKeyValue > lastItemSortableKeyValue;
  if (isAfterLastItem) return [arrayLength, false];

  const position = Math.floor(arrayLength / 2);
  const itemAtPosition = array?.[position]?.[sortableKey];

  if (itemAtPosition === itemSortableKeyValue) {
    return [position, true];
  }

  const itemBeforePosition = array?.[position - 1]?.[sortableKey];

  if (itemAtPosition > itemSortableKeyValue) {
    if (itemBeforePosition < itemSortableKeyValue) {
      return [position, false];
    } else {
      return findInsertIndex(value, array.slice(0, position), sortableKey);
    }
  } else {
    const itemAfterPosition = array?.[position + 1]?.[sortableKey];
    if (itemAfterPosition > itemSortableKeyValue) {
      return [position + 1, false];
    } else {
      const res = findInsertIndex(value, array.slice(position), sortableKey);
      return !res ? res : [position + res?.[0] || 0, res?.[1]];
    }
  }
}

/**Extracts keys whose values are of a certain type */
export type ExtractKeysOfType<T, Type> = keyof {
  [K in keyof T as T[K] extends Type ? K : never]: T[K];
};
