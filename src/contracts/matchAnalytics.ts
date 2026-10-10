import type { MissReason, Zone } from "./roundOutcome";

export type MotionVector = {
  x: number | null;
  y: number | null;
  z: number | null;
  timestamp: number | null;
};

export type MotionRotation = {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  timestamp: number | null;
};

/** Rotation: radians; rotationRate: degrees/s; acceleration: m/s². */
export type MotionSnapshot = {
  receivedAtMs: number;
  ageMs: number;
  rotation: MotionRotation | null;
  rotationRate: MotionRotation | null;
  acceleration: MotionVector | null;
  accelerationIncludingGravity: MotionVector | null;
  interval: number | null;
  orientation: number | null;
};

export type CalibrationPoseSnapshot = {
  capturedAtMs: number;
  confirmation: "hold" | "volume";
  accelerometer: { x: number; y: number; z: number; atMs: number } | null;
  motion: MotionSnapshot | null;
};

export type AnalyticsCalibration = {
  thetaReady: number;
  thetaShoulder: number;
  readyPose?: CalibrationPoseSnapshot;
  shoulderPose?: CalibrationPoseSnapshot;
};

export type AimDiagnostics = {
  capturedAtMs: number;
  heading: {
    value: number;
    accuracy: number;
    timestamp: number;
    ageMs: number;
  } | null;
  self: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
    ageMs: number;
  } | null;
  opponent: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
    ageMs: number | null;
  } | null;
  bearingDegrees: number | null;
  headingErrorDegrees: number | null;
  separationMeters: number | null;
  bypassedWithinGpsUncertainty: boolean;
  issues: string[];
};

export type ShotDiagnostics = {
  firedAtMs: number;
  thetaFire: number | null;
  raiseFraction: number | null;
  pitchStatus: string;
  pitchSampleUsable: boolean;
  motion: MotionSnapshot | null;
  aim: AimDiagnostics | null;
};

export type RoundAnalytics = {
  falseStarted?: boolean;
  roundNumber: number;
  reactionMs: number | null;
  zone: Zone;
  missReason: MissReason | null;
  shot: ShotDiagnostics | null;
};

/** Each phone uploads its own readings, never fabricated opponent motion. */
export type MatchAnalytics = {
  schemaVersion: 1;
  matchId: string;
  playerId: string;
  participantIds: [string, string];
  platform: string;
  completedAt: string;
  clockOffsetMs: number;
  calibration: AnalyticsCalibration;
  thresholds: {
    bodyshotMinF: number;
    bodyshotMaxF: number;
    headshotMaxF: number;
    aimToleranceDegrees: number;
  };
  rounds: RoundAnalytics[];
};
