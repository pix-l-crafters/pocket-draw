import type { AudioSource } from "expo-audio";

// Placeholder: assets/audio/countdown.mp3 is a silent stub so the bundler
// has something to require. Overwrite that file with the approved countdown
// cue (same filename, or update this path) — no code change needed either way.
export const COUNTDOWN_AUDIO_SOURCE: AudioSource | null = require("../../../assets/audio/countdown.mp3");
