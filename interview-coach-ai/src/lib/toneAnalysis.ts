export interface ToneSummary {
  averageRms: number;
  peakRms: number;
  averagePitchHz: number;
  pitchVariabilityHz: number;
  stabilityScore: number;
  sampledFrames: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }
  return value;
}

export function normalizeToneSummary(raw: unknown): ToneSummary | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const input = raw as Record<string, unknown>;
  const sampledFrames = Math.max(0, Math.round(normalizeNumber(input.sampledFrames)));

  if (sampledFrames === 0) {
    return null;
  }

  return {
    averageRms: clamp(normalizeNumber(input.averageRms), 0, 1),
    peakRms: clamp(normalizeNumber(input.peakRms), 0, 1),
    averagePitchHz: clamp(normalizeNumber(input.averagePitchHz), 0, 1000),
    pitchVariabilityHz: clamp(normalizeNumber(input.pitchVariabilityHz), 0, 500),
    stabilityScore: clamp(normalizeNumber(input.stabilityScore), 0, 10),
    sampledFrames,
  };
}