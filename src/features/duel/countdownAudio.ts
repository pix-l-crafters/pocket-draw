import type { AudioSource } from "expo-audio";

export const DUEL_CUES = {
  gameBegin: require("../../../assets/audio/game-begin.mp3"),
  countdown3: require("../../../assets/audio/countdown-3.mp3"),
  countdown2: require("../../../assets/audio/countdown-2.mp3"),
  countdown1: require("../../../assets/audio/countdown-1.mp3"),
  fire: require("../../../assets/audio/fire.mp3"),
  gunshot: require("../../../assets/audio/gunshot.mp3"),
  headshot: require("../../../assets/audio/headshot.mp3"),
  bodyshot: require("../../../assets/audio/bodyshot.mp3"),
  miss: require("../../../assets/audio/miss.mp3"),
  falseStart: require("../../../assets/audio/false-start.mp3")
} satisfies Record<string, AudioSource>;
