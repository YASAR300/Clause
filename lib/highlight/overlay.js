/**
 * Extracts and merges per-line highlight bounding boxes from a DOM Range
 * relative to a specific page container.
 *
 * Uses a scroll-stable approach: computes positions by subtracting the
 * page container's getBoundingClientRect() from the range's client rects,
 * then adjusting for the container's own scroll offset. This ensures
 * highlights are correctly placed regardless of when in the scroll cycle
 * getHighlightRects is called.
 *
 * @param {Range} range
 * @param {HTMLElement} pageContainer
 * @returns {Array<{ top: number, left: number, width: number, height: number }>}
 */
export function getHighlightRects(range, pageContainer) {
  if (!range || !pageContainer) {
    return [];
  }

  const containerRect =
    typeof pageContainer.getBoundingClientRect === "function"
      ? pageContainer.getBoundingClientRect()
      : { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 };

  // scrollLeft/scrollTop of the container itself (usually 0 for non-scrolling page divs)
  const scrollLeft = pageContainer.scrollLeft || 0;
  const scrollTop = pageContainer.scrollTop || 0;

  let rawRects =
    typeof range.getClientRects === "function"
      ? Array.from(range.getClientRects())
      : [];

  if (!rawRects.length && typeof range.getBoundingClientRect === "function") {
    const single = range.getBoundingClientRect();
    if (single && single.width > 0 && single.height > 0) {
      rawRects = [single];
    }
  }

  if (!rawRects.length) {
    return [];
  }

  // Convert raw client coordinates to stable container-relative coordinates.
  // Adding scrollLeft/scrollTop corrects for the container's own scroll offset.
  const relativeRects = [];
  for (const r of rawRects) {
    if (r.width <= 0 || r.height <= 0) continue;

    relativeRects.push({
      top: r.top - containerRect.top + scrollTop,
      left: r.left - containerRect.left + scrollLeft,
      width: r.width,
      height: r.height,
      bottom: r.bottom - containerRect.top + scrollTop,
      right: r.right - containerRect.left + scrollLeft,
    });
  }

  return mergeLineRects(relativeRects);
}

/**
 * Merges adjacent or overlapping rectangles that lie on the same visual line.
 *
 * @param {Array<{ top: number, left: number, width: number, height: number, bottom: number, right: number }>} rects
 * @returns {Array<{ top: number, left: number, width: number, height: number }>}
 */
export function mergeLineRects(rects) {
  if (!rects.length) return [];

  // Sort rects in reading order (top then left)
  const sorted = [...rects].sort((a, b) => {
    if (Math.abs(a.top - b.top) > 4) {
      return a.top - b.top;
    }
    return a.left - b.left;
  });

  const merged = [];
  let current = null;

  for (const r of sorted) {
    if (!current) {
      current = { ...r };
      continue;
    }

    // Check if on same line (vertical overlap or top within threshold)
    const sameLine =
      Math.abs(r.top - current.top) <= 5 ||
      (r.top < current.bottom && r.bottom > current.top);

    // Check if horizontally adjacent or overlapping
    const horizontallyAdjacent = r.left <= current.right + 8;

    if (sameLine && horizontallyAdjacent) {
      // Merge into current line
      current.left = Math.min(current.left, r.left);
      current.right = Math.max(current.right, r.right);
      current.top = Math.min(current.top, r.top);
      current.bottom = Math.max(current.bottom, r.bottom);
      current.width = current.right - current.left;
      current.height = current.bottom - current.top;
    } else {
      merged.push({
        top: Math.round(current.top * 10) / 10,
        left: Math.round(current.left * 10) / 10,
        width: Math.round(current.width * 10) / 10,
        height: Math.round(current.height * 10) / 10,
      });
      current = { ...r };
    }
  }

  if (current) {
    merged.push({
      top: Math.round(current.top * 10) / 10,
      left: Math.round(current.left * 10) / 10,
      width: Math.round(current.width * 10) / 10,
      height: Math.round(current.height * 10) / 10,
    });
  }

  return merged;
}

/**
 * Scrolls the highlight into view with smooth offset for sticky headers.
 *
 * @param {HTMLElement} pageElement
 * @param {Array<{ top: number }>} rects
 * @param {HTMLElement} scrollContainer
 * @param {number} [headerOffset=80]
 */
export function scrollHighlightIntoView(pageElement, rects, scrollContainer, headerOffset = 80) {
  if (!pageElement || !scrollContainer) return;

  const firstRectTop = rects?.length ? rects[0].top : 0;
  const pageContainerRect = pageElement.getBoundingClientRect();
  const scrollRect = scrollContainer.getBoundingClientRect();

  const targetTop =
    scrollContainer.scrollTop +
    (pageContainerRect.top - scrollRect.top) +
    firstRectTop -
    headerOffset;

  scrollContainer.scrollTo({
    top: Math.max(0, targetTop),
    behavior: "smooth",
  });
}
