/**
 * LRC parser, timestamp estimation for plain lyrics, and binary search active-line finder.
 */

const TIMESTAMP_REGEX = /\[(\d{1,2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
const METADATA_TAG_REGEX = /^\[[a-zA-Z]{2,8}:/;

export function parseLrc(lrcText) {
  if (!lrcText || typeof lrcText !== 'string') {
    return [];
  }

  // Extract offset in milliseconds if present: [offset: +/-ms]
  let offsetSeconds = 0;
  const offsetMatch = lrcText.match(/\[offset:\s*([+-]?\d+)\]/i);
  if (offsetMatch && offsetMatch[1]) {
    const parsedOffset = parseFloat(offsetMatch[1]);
    if (!isNaN(parsedOffset)) {
      offsetSeconds = parsedOffset / 1000;
    }
  }

  const lines = [];
  const rawLines = lrcText.split(/\r?\n/);

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed || METADATA_TAG_REGEX.test(trimmed)) {
      continue;
    }

    const matches = [...trimmed.matchAll(TIMESTAMP_REGEX)];
    if (matches.length === 0) {
      continue;
    }

    // Strip timestamps to obtain raw text
    const text = trimmed.replace(TIMESTAMP_REGEX, '').trim();
    if (!text) {
      continue;
    }

    for (const match of matches) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const millisPart = match[3] || '0';
      const millis = parseFloat(millisPart) / (millisPart.length === 3 ? 1000 : 100);

      const calculatedTime = parseFloat(
        (minutes * 60 + seconds + millis + offsetSeconds).toFixed(2)
      );
      const finalTime = Math.max(0, calculatedTime);

      lines.push({
        time: finalTime,
        time_seconds: finalTime,
        text,
      });
    }
  }

  // Sort chronologically
  lines.sort((a, b) => a.time - b.time);
  return lines;
}

export function estimatePlainLyricsSync(plainLines, durationSeconds = 180) {
  if (!plainLines) return [];
  const linesArray = Array.isArray(plainLines)
    ? plainLines
    : String(plainLines).split(/\r?\n/);

  const cleanLines = linesArray
    .map((l) => (typeof l === 'string' ? l.trim() : (l?.text || '').trim()))
    .filter(Boolean);

  if (cleanLines.length === 0) return [];

  const totalDuration = Math.max(durationSeconds || 180, 10);
  const introLeadIn = totalDuration * 0.08;
  const outroBuffer = totalDuration * 0.05;
  const availableDuration = Math.max(1, totalDuration - introLeadIn - outroBuffer);

  const totalChars = cleanLines.reduce((sum, line) => sum + Math.max(line.length, 1), 0);

  let currentCursor = introLeadIn;
  const estimated = [];

  for (const line of cleanLines) {
    const weight = Math.max(line.length, 1) / totalChars;
    const lineDuration = weight * availableDuration;
    const roundedTime = parseFloat(currentCursor.toFixed(2));

    estimated.push({
      time: roundedTime,
      time_seconds: roundedTime,
      text: line,
      isEstimated: true,
    });

    currentCursor += lineDuration;
  }

  return estimated;
}

export function findActiveLineIndex(lines, currentTime) {
  if (!lines || lines.length === 0) {
    return -1;
  }

  const time = typeof currentTime === 'number' ? currentTime : 0;
  if (time < lines[0].time) {
    return -1;
  }
  if (time >= lines[lines.length - 1].time) {
    return lines.length - 1;
  }

  let low = 0;
  let high = lines.length - 1;
  let activeIndex = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lines[mid].time <= time) {
      activeIndex = mid;
      low = mid + 1; // Seek further in case a later line also qualifies
    } else {
      high = mid - 1;
    }
  }

  return activeIndex;
}
