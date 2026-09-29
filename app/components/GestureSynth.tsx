"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import * as Tone from "tone";
import {
  Volume2,
  VolumeX,
  Camera as CameraIcon,
  Music,
  Activity,
  Sparkles,
  Maximize2,
  Minimize2,
  RefreshCw,
  Sliders,
  Play,
  Zap,
  Gauge,
  User,
  LogOut,
  HelpCircle,
  ArrowUp,
  ArrowDown,
  Layers,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

// =========================================================================
// 1. DATA STRUCTURES & MUSIC THEORY CONFIGURATION
// =========================================================================

export interface ScaleDegreeConfig {
  degree: number;
  romanMajor: string;
  romanMinor: string;
  baseMajorName: string;
  baseMinorName: string;
  majorNotes: string[];
  minorNotes: string[];
  color: string;
  fingerPattern: string;
  fingerHint: string;
}

export interface ActiveChord {
  name: string;
  roman: string;
  degree: number;
  isMinor: boolean;
  shift: number; // -1: flat (b), 0: natural, +1: sharp (#)
  notes: string[];
  color: string;
  gestureHint: string;
  fingerPattern: string;
}

export const SCALE_DEGREES: Record<number, ScaleDegreeConfig> = {
  1: {
    degree: 1,
    romanMajor: "I",
    romanMinor: "i",
    baseMajorName: "C",
    baseMinorName: "Cm",
    majorNotes: ["C4", "E4", "G4"],
    minorNotes: ["C4", "Eb4", "G4"],
    color: "#06b6d4", // Cyan
    fingerPattern: "☝️ 1 Ngón Trỏ",
    fingerHint: "1 ngón duỗi thẳng → Bậc I",
  },
  2: {
    degree: 2,
    romanMajor: "II",
    romanMinor: "ii",
    baseMajorName: "D",
    baseMinorName: "Dm",
    majorNotes: ["D4", "F#4", "A4"],
    minorNotes: ["D4", "F4", "A4"],
    color: "#3b82f6", // Blue
    fingerPattern: "✌️ 2 Ngón (Trỏ + Giữa)",
    fingerHint: "2 ngón duỗi thẳng → Bậc II",
  },
  3: {
    degree: 3,
    romanMajor: "III",
    romanMinor: "iii",
    baseMajorName: "E",
    baseMinorName: "Em",
    majorNotes: ["E4", "G#4", "B4"],
    minorNotes: ["E4", "G4", "B4"],
    color: "#8b5cf6", // Violet
    fingerPattern: "👆+👍+✌️ 3 Ngón (Cái + Trỏ + Giữa)",
    fingerHint: "Ngón cái + ngón trỏ + ngón giữa → Bậc III",
  },
  4: {
    degree: 4,
    romanMajor: "IV",
    romanMinor: "iv",
    baseMajorName: "F",
    baseMinorName: "Fm",
    majorNotes: ["F3", "A3", "C4"],
    minorNotes: ["F3", "Ab3", "C4"],
    color: "#a855f7", // Purple
    fingerPattern: "🖖 4 Ngón Tay (Trỏ + Giữa + Áp + Út)",
    fingerHint: "4 ngón duỗi thẳng → Bậc IV",
  },
  5: {
    degree: 5,
    romanMajor: "V",
    romanMinor: "v",
    baseMajorName: "G",
    baseMinorName: "Gm",
    majorNotes: ["G3", "B3", "D4"],
    minorNotes: ["G3", "Bb3", "D4"],
    color: "#eab308", // Golden Yellow
    fingerPattern: "🖐️ 5 Ngón Xòe (Cả Bàn Tay)",
    fingerHint: "Cả 5 ngón xòe rộng → Bậc V",
  },
  6: {
    degree: 6,
    romanMajor: "VI",
    romanMinor: "vi",
    baseMajorName: "A",
    baseMinorName: "Am",
    majorNotes: ["A3", "C#4", "E4"],
    minorNotes: ["A3", "C4", "E4"],
    color: "#ec4899", // Neon Pink
    fingerPattern: "👆+👍 Ký Hiệu Rock (Cái + Trỏ)",
    fingerHint: "Ngón cái & ngón trỏ (Ký hiệu Rock) → Bậc VI",
  },
  7: {
    degree: 7,
    romanMajor: "VII",
    romanMinor: "vii",
    baseMajorName: "B",
    baseMinorName: "Bm",
    majorNotes: ["B3", "D#4", "F#4"],
    minorNotes: ["B3", "D4", "F#4"],
    color: "#10b981", // Emerald Green
    fingerPattern: "🤟 Rock + Ngón Út (Cái + Trỏ + Út)",
    fingerHint: "Ngón cái + ngón trỏ + ngón út → Bậc VII",
  },
};

const CHORD_NAMES: Record<
  "major" | "minor",
  Record<number, Record<number, string>>
> = {
  major: {
    1: { [-1]: "B", [0]: "C", [1]: "C#" },
    2: { [-1]: "Db", [0]: "D", [1]: "D#" },
    3: { [-1]: "Eb", [0]: "E", [1]: "F" },
    4: { [-1]: "E", [0]: "F", [1]: "F#" },
    5: { [-1]: "Gb", [0]: "G", [1]: "G#" },
    6: { [-1]: "Ab", [0]: "A", [1]: "A#" },
    7: { [-1]: "Bb", [0]: "B", [1]: "C" },
  },
  minor: {
    1: { [-1]: "Bm", [0]: "Cm", [1]: "C#m" },
    2: { [-1]: "Dbm", [0]: "Dm", [1]: "D#m" },
    3: { [-1]: "Ebm", [0]: "Em", [1]: "Fm" },
    4: { [-1]: "Em", [0]: "Fm", [1]: "F#m" },
    5: { [-1]: "Gbm", [0]: "Gm", [1]: "G#m" },
    6: { [-1]: "Abm", [0]: "Am", [1]: "A#m" },
    7: { [-1]: "Bbm", [0]: "Bm", [1]: "Cm" },
  },
};

function resolveChord(
  degree: number,
  isMinor: boolean,
  shift: number
): ActiveChord {
  const config = SCALE_DEGREES[degree] || SCALE_DEGREES[1];
  const modeKey = isMinor ? "minor" : "major";
  const chordName =
    CHORD_NAMES[modeKey]?.[degree]?.[shift] ||
    (isMinor ? config.baseMinorName : config.baseMajorName);

  const baseNotes = isMinor ? config.minorNotes : config.majorNotes;

  const transposedNotes =
    shift === 0
      ? [...baseNotes]
      : baseNotes.map((note) => Tone.Frequency(note).transpose(shift).toNote());

  const romanBase = isMinor ? config.romanMinor : config.romanMajor;
  let romanDisplay = romanBase;
  if (shift === 1) romanDisplay += "#";
  else if (shift === -1) romanDisplay += "b";

  return {
    name: chordName,
    roman: romanDisplay,
    degree,
    isMinor,
    shift,
    notes: transposedNotes,
    color: config.color,
    gestureHint: `${config.fingerHint} • ${
      isMinor ? "Nghiêng ngoài (Minor)" : "Nghiêng trong (Major)"
    }${shift === 1 ? " • Tông cao (#)" : shift === -1 ? " • Tông trầm (♭)" : ""}`,
    fingerPattern: config.fingerPattern,
  };
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
}

// =========================================================================
// 2. MAIN COMPONENT: GESTURE SYNTH (PERFORMANCE ARCHITECTURE)
// =========================================================================

export default function GestureSynth() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Audio Engine Refs
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const filterRef = useRef<Tone.Filter | null>(null);
  const reverbRef = useRef<Tone.Freeverb | null>(null);
  const waveformRef = useRef<Tone.Waveform | null>(null);
  const volumeNodeRef = useRef<Tone.Volume | null>(null);

  // Decoupled Camera & Tracking Refs
  const isRunningRef = useRef<boolean>(false);
  const isAiBusyRef = useRef<boolean>(false);
  const latestResultsRef = useRef<any>(null);
  const cameraInstanceRef = useRef<any>(null);
  const handsInstanceRef = useRef<any>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  // Chord States & Hysteresis Memory
  const activeChordKeyRef = useRef<string>("1-false-0");
  const lastDegreeRef = useRef<number>(1);
  const isMinorStateRef = useRef<boolean>(false);
  const pitchShiftStateRef = useRef<number>(0);
  const lastTriggerTimeRef = useRef<number>(0);
  const isPinchedRef = useRef<boolean>(false);

  // Fast Settings Refs (Không gây re-render)
  const playModeRef = useRef<"two-handed" | "left-only">("two-handed");
  const pitchShiftEnabledRef = useRef<boolean>(true);
  const autoStrumRef = useRef<boolean>(true);

  // FPS & Diagnostics Tracking
  const frameCountRef = useRef<number>(0);
  const aiFrameCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(performance.now());
  const aiFpsRef = useRef<number>(30);
  const lastDetectedHandTimeRef = useRef<number>(0);

  // React State for UI Only (Chỉ cập nhật khi hợp âm hoặc settings đổi)
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentChord, setCurrentChord] = useState<ActiveChord>(() =>
    resolveChord(1, false, 0)
  );

  const [playMode, setPlayMode] = useState<"two-handed" | "left-only">(
    "two-handed"
  );
  const [pitchShiftEnabled, setPitchShiftEnabled] = useState<boolean>(true);
  const [autoStrum, setAutoStrum] = useState<boolean>(true);
  const [soundPreset, setSoundPreset] = useState<"ethereal" | "retro" | "harp">(
    "ethereal"
  );
  const [volume, setVolume] = useState<number>(-2);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const [fps, setFps] = useState<number>(60);
  const [aiFps, setAiFps] = useState<number>(30);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [guideActiveTab, setGuideActiveTab] = useState<
    "quickstart" | "degrees" | "tilt" | "pitch" | "chords" | "settings"
  >("quickstart");
  const [showHelperSidebar, setShowHelperSidebar] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);

  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    playModeRef.current = playMode;
    if (handsInstanceRef.current) {
      handsInstanceRef.current.setOptions({
        maxNumHands: playMode === "left-only" ? 1 : 2,
      });
    }
  }, [playMode]);

  useEffect(() => {
    pitchShiftEnabledRef.current = pitchShiftEnabled;
  }, [pitchShiftEnabled]);

  useEffect(() => {
    autoStrumRef.current = autoStrum;
  }, [autoStrum]);

  // =========================================================================
  // 3. LOW-LATENCY AUDIO ENGINE (TONE.JS)
  // =========================================================================

  const setupAudio = useCallback(async () => {
    await Tone.start();
    if (Tone.context.state !== "running") {
      await Tone.context.resume();
    }
    // Giảm lookAhead xuống 0.02s để phản hồi ngay lập tức
    Tone.getContext().lookAhead = 0.02;

    if (synthRef.current) {
      try {
        synthRef.current.dispose();
      } catch (e) {
        console.warn(e);
      }
    }

    const vol = new Tone.Volume(volume).toDestination();
    volumeNodeRef.current = vol;

    const waveform = new Tone.Waveform(256);
    waveformRef.current = waveform;

    const reverb = new Tone.Freeverb({
      roomSize: 0.55,
      dampening: 2800,
      wet: 0.22,
    });
    reverbRef.current = reverb;

    const filter = new Tone.Filter({
      frequency: 4000,
      type: "lowpass",
      rolloff: -12,
      Q: 1.0,
    });
    filterRef.current = filter;

    const polySynth = new Tone.PolySynth(Tone.Synth, {
      volume: -4,
      oscillator: {
        type: "fatsawtooth",
        count: 2,
        spread: 16,
      },
      envelope: {
        attack: 0.015,
        decay: 0.35,
        sustain: 0.4,
        release: 0.6,
      },
    });
    polySynth.maxPolyphony = 12;

    polySynth.chain(filter, reverb, waveform, vol);
    synthRef.current = polySynth;
  }, [volume]);

  const applyPreset = useCallback((preset: "ethereal" | "retro" | "harp") => {
    if (!synthRef.current) return;
    setSoundPreset(preset);

    if (preset === "ethereal") {
      synthRef.current.set({
        oscillator: { type: "fatsawtooth", count: 2, spread: 20 },
        envelope: { attack: 0.03, decay: 0.5, sustain: 0.45, release: 1.2 },
      });
      if (reverbRef.current) reverbRef.current.wet.value = 0.3;
    } else if (preset === "retro") {
      synthRef.current.set({
        oscillator: { type: "pulse", width: 0.3 },
        envelope: { attack: 0.01, decay: 0.22, sustain: 0.25, release: 0.4 },
      });
      if (reverbRef.current) reverbRef.current.wet.value = 0.12;
    } else if (preset === "harp") {
      synthRef.current.set({
        oscillator: { type: "triangle8" },
        envelope: { attack: 0.005, decay: 0.65, sustain: 0.05, release: 1.0 },
      });
      if (reverbRef.current) reverbRef.current.wet.value = 0.35;
    }
  }, []);

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (volumeNodeRef.current) {
      volumeNodeRef.current.volume.rampTo(newVol, 0.05);
    }
  };

  const toggleMute = () => {
    if (!volumeNodeRef.current) return;
    if (isMuted) {
      volumeNodeRef.current.mute = false;
      setIsMuted(false);
    } else {
      volumeNodeRef.current.mute = true;
      setIsMuted(true);
    }
  };

  const triggerChord = useCallback(
    (chord: ActiveChord, intensity: number = 0.9) => {
      const now = performance.now();
      if (now - lastTriggerTimeRef.current < 130) return;
      lastTriggerTimeRef.current = now;

      if (Tone.context.state !== "running") {
        Tone.context.resume().catch((e) => console.warn(e));
      }

      if (synthRef.current) {
        try {
          synthRef.current.triggerAttackRelease(
            chord.notes,
            "4n",
            undefined,
            Math.min(1, Math.max(0.4, intensity))
          );
        } catch (e) {
          console.error("Audio trigger error:", e);
        }
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const cx = canvas.width * 0.5;
        const cy = canvas.height * 0.6;
        for (let i = 0; i < 16; i++) {
          const angle = (Math.PI * 2 * i) / 16 + Math.random() * 0.4;
          const speed = 2.5 + Math.random() * 4.5;
          particlesRef.current.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: chord.color,
            size: 3 + Math.random() * 3,
            alpha: 1,
            life: 1,
          });
        }
      }
    },
    []
  );

  const dist = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
  };

  // =========================================================================
  // 4. ROBUST FINGER EXTENSION & GESTURE RECOGNITION (ANGLE-INVARIANT)
  // =========================================================================

  /**
   * Nhận diện ngón tay mở dựa trên khoảng cách hình học bất biến góc xoay
   */
  const getFingersExtended = (landmarks: any[]) => {
    const wrist = landmarks[0];

    const isExtended = (tipIdx: number, pipIdx: number, mcpIdx: number) => {
      const tip = landmarks[tipIdx];
      const pip = landmarks[pipIdx];
      const mcp = landmarks[mcpIdx];

      // Khoảng cách từ ngọn tới cổ tay so với khớp PIP tới cổ tay
      const toWristTip = dist(wrist, tip);
      const toWristPip = dist(wrist, pip);

      // Khoảng cách từ khớp gốc MCP tới ngọn so với MCP tới PIP
      const toMcpTip = dist(mcp, tip);
      const toMcpPip = dist(mcp, pip);

      return toWristTip > toWristPip * 1.05 && toMcpTip > toMcpPip * 1.2;
    };

    const isIndexExtended = isExtended(8, 6, 5);
    const isMiddleExtended = isExtended(12, 10, 9);
    const isRingExtended = isExtended(16, 14, 13);
    const isPinkyExtended = isExtended(20, 18, 17);

    // Ngón cái (4)
    const isThumbExtended =
      dist(landmarks[4], landmarks[17]) > dist(landmarks[3], landmarks[17]) * 1.12 ||
      dist(landmarks[4], landmarks[5]) > dist(landmarks[2], landmarks[5]) * 1.15;

    return {
      thumb: isThumbExtended,
      index: isIndexExtended,
      middle: isMiddleExtended,
      ring: isRingExtended,
      pinky: isPinkyExtended,
    };
  };

  /**
   * Xử lý Bàn tay Hợp âm (Scale Degrees 1-7, Tilt Hysteresis, Pitch Shift)
   */
  const processChordHand = (landmarks: any[], screenIsLeftHalf: boolean) => {
    const f = getFingersExtended(landmarks);
    const wrist = landmarks[0];
    const middleMcp = landmarks[9];

    // 1. Nhận diện Bậc âm (Scale Degree) theo quy ước ngón tay người dùng
    let detectedDegree: number | null = null;

    // Bậc VI: Ký hiệu Rock (Ngón cái + Ngón trỏ theo yêu cầu)
    const isRockCustom = f.thumb && f.index && !f.middle && !f.ring && !f.pinky;
    // Đồng thời hỗ trợ cả Rock cổ điển (Trỏ + Út) nếu quen tay
    const isRockClassic = f.index && f.pinky && !f.middle && !f.ring && !f.thumb;

    // Bậc VII: Ngón cái + Trỏ + Út (hoặc Rock cổ điển + Cái)
    const isDegree7 =
      (f.thumb && f.index && f.pinky && !f.middle && !f.ring) ||
      (f.index && f.pinky && f.thumb && !f.middle && !f.ring);

    // Bậc III: 3 ngón (Ngón cái + Ngón trỏ + Ngón giữa theo yêu cầu)
    const isThreeFingersCustom = f.thumb && f.index && f.middle && !f.ring && !f.pinky;
    const isThreeFingersClassic = !f.thumb && f.index && f.middle && f.ring && !f.pinky;

    if (isDegree7) {
      detectedDegree = 7;
    } else if (isRockCustom || isRockClassic) {
      detectedDegree = 6;
    } else if (f.thumb && f.index && f.middle && f.ring && f.pinky) {
      detectedDegree = 5;
    } else if (f.index && f.middle && f.ring && f.pinky && !f.thumb) {
      detectedDegree = 4;
    } else if (isThreeFingersCustom || isThreeFingersClassic) {
      detectedDegree = 3;
    } else if (f.index && f.middle && !f.thumb && !f.ring && !f.pinky) {
      detectedDegree = 2;
    } else if (f.index && !f.thumb && !f.middle && !f.ring && !f.pinky) {
      detectedDegree = 1;
    } else {
      // Fallback đếm tổng số ngón mở
      const count =
        (f.index ? 1 : 0) +
        (f.middle ? 1 : 0) +
        (f.ring ? 1 : 0) +
        (f.pinky ? 1 : 0) +
        (f.thumb ? 1 : 0);
      if (count === 1) detectedDegree = 1;
      else if (count === 2) detectedDegree = 2;
      else if (count === 3) detectedDegree = 3;
      else if (count === 4) detectedDegree = 4;
      else if (count === 5) detectedDegree = 5;
    }

    // Nếu không rõ cử chỉ, giữ bậc âm hiện tại để tránh rung giật
    const currentDegree = detectedDegree || lastDegreeRef.current;
    lastDegreeRef.current = currentDegree;

    // 2. Góc nghiêng cổ tay (Tilt Major / Minor) kèm Deadband Hysteresis
    // dxScreen: độ lệch theo phương ngang trong màn hình lật gương
    const dxScreen = (1 - middleMcp.x) - (1 - wrist.x);
    const dyScreen = wrist.y - middleMcp.y; // > 0 khi tay hướng lên
    const angleDeg = Math.atan2(dxScreen, Math.max(0.1, dyScreen)) * (180 / Math.PI);

    // Khi tay ở nửa trái màn hình:
    // Nghiêng vào trong (sang phải, góc > 10°) -> Major
    // Nghiêng ra ngoài (sang trái, góc < -10°) -> Minor
    // Vùng deadzone (-10° đến +10°): Giữ nguyên trạng thái để không bị chập chờn
    let isMinor = isMinorStateRef.current;
    if (screenIsLeftHalf) {
      if (angleDeg < -10) {
        isMinor = true;
      } else if (angleDeg > 10) {
        isMinor = false;
      }
    } else {
      if (angleDeg > 10) {
        isMinor = true;
      } else if (angleDeg < -10) {
        isMinor = false;
      }
    }
    isMinorStateRef.current = isMinor;

    // 3. Tính năng Pitch Shift (Dịch tông nửa cung) kèm Deadband Hysteresis
    let shift = pitchShiftStateRef.current;
    if (pitchShiftEnabledRef.current) {
      const wristY = wrist.y;
      if (shift === 0) {
        if (wristY < 0.22) shift = 1;
        else if (wristY > 0.78) shift = -1;
      } else if (shift === 1) {
        if (wristY > 0.3) shift = 0;
      } else if (shift === -1) {
        if (wristY < 0.7) shift = 0;
      }
    } else {
      shift = 0;
    }
    pitchShiftStateRef.current = shift;

    // 4. Cập nhật Hợp âm & Auto-Strum
    const newKey = `${currentDegree}-${isMinor}-${shift}`;
    if (newKey !== activeChordKeyRef.current) {
      activeChordKeyRef.current = newKey;
      const newChord = resolveChord(currentDegree, isMinor, shift);
      setCurrentChord(newChord);

      if (autoStrumRef.current || playModeRef.current === "left-only") {
        triggerChord(newChord, 0.85);
      }
    }
  };

  /**
   * Xử lý Bàn tay Gảy Nốt & Filter
   */
  const processTriggerHand = (landmarks: any[]) => {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const pinchDistance = dist(thumbTip, indexTip);
    const handY = landmarks[0].y;

    if (filterRef.current) {
      const targetFreq = 400 + (1 - handY) * 5600;
      filterRef.current.frequency.rampTo(targetFreq, 0.05);
    }

    const isPinchingNow = pinchDistance < 0.085;

    if (isPinchingNow && !isPinchedRef.current) {
      isPinchedRef.current = true;
      const [deg, min, shf] = activeChordKeyRef.current.split("-");
      const active = resolveChord(
        Number(deg) || 1,
        min === "true",
        Number(shf) || 0
      );
      triggerChord(active, 1.0);

      const canvas = canvasRef.current;
      if (canvas) {
        const pinchCanvasX = (1 - indexTip.x) * canvas.width;
        const pinchCanvasY = indexTip.y * canvas.height;
        for (let i = 0; i < 14; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 5;
          particlesRef.current.push({
            x: pinchCanvasX,
            y: pinchCanvasY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: "#f43f5e",
            size: 4 + Math.random() * 2,
            alpha: 1,
            life: 0.85,
          });
        }
      }
    } else if (!isPinchingNow && pinchDistance > 0.11) {
      isPinchedRef.current = false;
    }
  };

  // =========================================================================
  // 5. HARDWARE ACCELERATED RENDER LOOP (60 FPS)
  // =========================================================================

  const renderFrame = () => {
    if (!isRunningRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || video.readyState < 2) {
      animationFrameIdRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Mirrored Camera Feed
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);

    ctx.fillStyle = "rgba(4, 7, 20, 0.65)";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // 2. Guide lines cho Pitch Shift
    if (pitchShiftEnabledRef.current) {
      ctx.save();
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);

      ctx.strokeStyle = "rgba(16, 185, 129, 0.45)";
      ctx.beginPath();
      ctx.moveTo(0, height * 0.22);
      ctx.lineTo(width, height * 0.22);
      ctx.stroke();

      ctx.fillStyle = "rgba(16, 185, 129, 0.9)";
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("▲ VÙNG NÂNG TÔNG (+1 SEMITONE #)", 24, height * 0.22 - 8);

      ctx.strokeStyle = "rgba(244, 63, 94, 0.45)";
      ctx.beginPath();
      ctx.moveTo(0, height * 0.78);
      ctx.lineTo(width, height * 0.78);
      ctx.stroke();

      ctx.fillStyle = "rgba(244, 63, 94, 0.9)";
      ctx.fillText("▼ VÙNG HẠ TÔNG (-1 SEMITONE ♭)", 24, height * 0.78 + 18);
      ctx.restore();
    }

    // 3. Hand Skeleton & White Dots
    const results = latestResultsRef.current;
    if (results && results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      lastDetectedHandTimeRef.current = performance.now();

      const HAND_CONNECTIONS = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [5, 9], [9, 10], [10, 11], [11, 12],
        [9, 13], [13, 14], [14, 15], [15, 16],
        [13, 17], [17, 18], [18, 19], [19, 20],
        [0, 17],
      ];

      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i];
        const wristScreenX = (1 - landmarks[0].x) * width;
        const isChordHand =
          playModeRef.current === "left-only" ||
          results.multiHandLandmarks.length === 1 ||
          wristScreenX < width * 0.5;

        const themeColor = isChordHand ? "#06b6d4" : "#ec4899";

        ctx.beginPath();
        for (const [start, end] of HAND_CONNECTIONS) {
          ctx.moveTo((1 - landmarks[start].x) * width, landmarks[start].y * height);
          ctx.lineTo((1 - landmarks[end].x) * width, landmarks[end].y * height);
        }
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.stroke();

        for (let j = 0; j < landmarks.length; j++) {
          const ptX = (1 - landmarks[j].x) * width;
          const ptY = landmarks[j].y * height;
          const isTip = [4, 8, 12, 16, 20].includes(j);

          ctx.beginPath();
          ctx.arc(ptX, ptY, isTip ? 4.5 : 2.5, 0, Math.PI * 2);
          ctx.fillStyle = isTip ? themeColor : "#ffffff";
          ctx.fill();
        }

        const wristY = landmarks[0].y * height;
        ctx.fillStyle = "rgba(10, 15, 30, 0.85)";
        ctx.beginPath();
        ctx.roundRect(wristScreenX - 70, wristY + 12, 140, 24, 6);
        ctx.fill();
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = themeColor;
        ctx.font = "bold 10px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          isChordHand ? "TAY HỢP ÂM" : "TAY GẢY NỐT",
          wristScreenX,
          wristY + 28
        );
      }
    } else {
      // Nhắc nhở nếu chưa thấy bàn tay
      const timeSinceLastHand = performance.now() - lastDetectedHandTimeRef.current;
      if (timeSinceLastHand > 800) {
        ctx.save();
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.font = "500 13px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Đưa bàn tay lên trước camera để bắt đầu...", width * 0.5, height * 0.45);
        ctx.restore();
      }
    }

    // 4. Golden Waveform Visualizer
    if (waveformRef.current) {
      const waveformValues = waveformRef.current.getValue();
      const waveBaseY = height * 0.88;
      const waveAmplitude = height * 0.08;

      ctx.beginPath();
      const sliceWidth = width / (waveformValues.length - 1);
      for (let i = 0; i < waveformValues.length; i++) {
        const x = i * sliceWidth;
        const y = waveBaseY + waveformValues[i] * waveAmplitude;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      const waveGrad = ctx.createLinearGradient(0, waveBaseY - waveAmplitude, width, waveBaseY + waveAmplitude);
      waveGrad.addColorStop(0, "#fef08a");
      waveGrad.addColorStop(0.5, "#facc15");
      waveGrad.addColorStop(1, "#f59e0b");

      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(250, 204, 21, 0.25)";
      ctx.stroke();

      ctx.lineWidth = 2;
      ctx.strokeStyle = waveGrad;
      ctx.stroke();
    }

    // 5. Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.025;
      p.life -= 0.025;

      if (p.alpha <= 0 || p.life <= 0) {
        particlesRef.current.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 6. FPS Calculation
    frameCountRef.current += 1;
    const now = performance.now();
    if (now - lastFpsTimeRef.current >= 1000) {
      setFps(frameCountRef.current);
      setAiFps(aiFrameCountRef.current);
      frameCountRef.current = 0;
      aiFrameCountRef.current = 0;
      lastFpsTimeRef.current = now;
    }

    animationFrameIdRef.current = requestAnimationFrame(renderFrame);
  };

  // =========================================================================
  // 6. INITIALIZATION & CAMERA LOOP (ZERO LAG / LOCAL WASM)
  // =========================================================================

  const startApp = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      await setupAudio();

      if (!videoRef.current) {
        throw new Error("Video element không khả dụng.");
      }

      // Khởi tạo MediaPipe Hands với file Wasm phục vụ trực tiếp từ Localhost (Không tải CDN chậm)
      const handsModule = await import("@mediapipe/hands");
      const HandsClass = handsModule.Hands || (window as any).Hands;

      if (!HandsClass) {
        throw new Error("Không thể khởi tạo thư viện MediaPipe Hands.");
      }

      const hands = new HandsClass({
        locateFile: (file: string) => `/mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: playModeRef.current === "left-only" ? 1 : 2,
        modelComplexity: 0, // Lite Model cho tốc độ xử lý nhanh nhất
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      hands.onResults((results: any) => {
        aiFrameCountRef.current += 1;
        latestResultsRef.current = results;

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          if (results.multiHandLandmarks.length === 1) {
            // Chế độ 1 tay: vừa chọn hợp âm vừa hỗ trợ pinch gảy nốt
            processChordHand(results.multiHandLandmarks[0], true);
            processTriggerHand(results.multiHandLandmarks[0]);
          } else {
            // Chế độ 2 tay: tay trái chọn hợp âm, tay phải gảy & filter
            const hand0X = 1 - results.multiHandLandmarks[0][0].x;
            const hand1X = 1 - results.multiHandLandmarks[1][0].x;

            if (hand0X < hand1X) {
              processChordHand(results.multiHandLandmarks[0], true);
              processTriggerHand(results.multiHandLandmarks[1]);
            } else {
              processChordHand(results.multiHandLandmarks[1], true);
              processTriggerHand(results.multiHandLandmarks[0]);
            }
          }
        }
      });

      await hands.initialize();
      handsInstanceRef.current = hands;

      // Sử dụng MediaPipe Camera Utils chính hãng (Tự động drop-frame khi CPU bận, không bị nghẽn loop)
      const cameraUtils = await import("@mediapipe/camera_utils");
      const CameraClass = cameraUtils.Camera;

      const camera = new CameraClass(videoRef.current, {
        onFrame: async () => {
          if (!isRunningRef.current || !videoRef.current) return;
          if (isAiBusyRef.current) return; // Skip frame nếu AI đang bận tính toán frame trước

          isAiBusyRef.current = true;
          try {
            await hands.send({ image: videoRef.current });
          } catch (err) {
            console.warn("AI inference frame dropped:", err);
          } finally {
            isAiBusyRef.current = false; // Luôn đảm bảo giải phóng cờ
          }
        },
        width: 640,
        height: 480,
      });

      await camera.start();
      cameraInstanceRef.current = camera;

      if (canvasRef.current && videoRef.current) {
        canvasRef.current.width = videoRef.current.videoWidth || 640;
        canvasRef.current.height = videoRef.current.videoHeight || 480;
      }

      isRunningRef.current = true;
      animationFrameIdRef.current = requestAnimationFrame(renderFrame);

      setIsStarted(true);
      setIsLoading(false);
    } catch (err: any) {
      console.error("Initialization failed:", err);
      setErrorMessage(
        err.message ||
          "Không thể mở camera hoặc audio. Vui lòng cấp quyền camera trong trình duyệt."
      );
      setIsLoading(false);
    }
  };

  const stopApp = useCallback(async () => {
    isRunningRef.current = false;
    isAiBusyRef.current = false;

    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }

    if (cameraInstanceRef.current) {
      try {
        await cameraInstanceRef.current.stop();
      } catch (e) {
        console.warn(e);
      }
      cameraInstanceRef.current = null;
    }

    if (synthRef.current) {
      try {
        synthRef.current.dispose();
      } catch (e) {
        console.warn(e);
      }
      synthRef.current = null;
    }

    setIsStarted(false);
  }, []);

  useEffect(() => {
    return () => {
      stopApp();
    };
  }, [stopApp]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-slate-950 text-slate-100 overflow-hidden select-none font-sans flex flex-col"
      onClick={() => {
        if (isStarted) {
          triggerChord(currentChord, 0.95);
        }
      }}
    >
      <video ref={videoRef} className="hidden" playsInline muted />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover z-0"
      />

      {/* TOP NAVIGATION BAR */}
      <header
        className="relative z-20 flex items-center justify-between px-6 py-3 bg-slate-950/50 backdrop-blur-md border-b border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-pink-500 p-0.5 shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm sm:text-base tracking-wide bg-gradient-to-r from-cyan-400 via-pink-400 to-yellow-300 bg-clip-text text-transparent">
                GESTURE SYNTH
              </h1>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                PRO 60 FPS
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Web Audio Synthesizer • Scale Degrees I-VII • Pitch Shift
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isStarted && (
            <>
              <button
                onClick={() => triggerChord(currentChord, 1.0)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-semibold text-xs shadow-md shadow-pink-500/20 active:scale-95 transition cursor-pointer"
                title="Bấm để thử phát hợp âm hiện tại"
              >
                <Music className="w-3.5 h-3.5" />
                <span>Thử Âm ({currentChord.name})</span>
              </button>

              <button
                onClick={() =>
                  setPlayMode(playMode === "two-handed" ? "left-only" : "two-handed")
                }
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                  playMode === "two-handed"
                    ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                    : "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                }`}
                title="Chuyển chế độ 2 tay hoặc 1 tay"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>
                  {playMode === "two-handed" ? "2 Tay" : "1 Tay (Tự Động)"}
                </span>
              </button>

              <button
                onClick={() => setPitchShiftEnabled(!pitchShiftEnabled)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                  pitchShiftEnabled
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                    : "bg-slate-900/80 border-white/10 text-slate-400"
                }`}
                title="Bật/Tắt đổi tông nửa cung theo độ cao tay"
              >
                <Zap
                  className={`w-3.5 h-3.5 ${
                    pitchShiftEnabled ? "text-emerald-400 fill-emerald-400" : ""
                  }`}
                />
                <span>Pitch Shift: {pitchShiftEnabled ? "BẬT" : "TẮT"}</span>
              </button>

              <div className="flex items-center bg-slate-900/80 border border-white/10 rounded-xl p-0.5 text-xs">
                {(["ethereal", "retro", "harp"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => applyPreset(p)}
                    className={`px-2.5 py-1 rounded-lg capitalize font-medium transition-all cursor-pointer ${
                      soundPreset === p
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 bg-slate-900/80 border border-white/10 rounded-xl px-2.5 py-1.5">
                <button
                  onClick={toggleMute}
                  className="text-slate-300 hover:text-white transition cursor-pointer"
                  title={isMuted ? "Bật âm" : "Tắt âm"}
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-red-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                  )}
                </button>
                <input
                  type="range"
                  min="-24"
                  max="6"
                  step="1"
                  value={volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-16 accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                />
              </div>

              {/* Hardware Performance Indicator */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-emerald-500/30 text-xs font-mono text-emerald-400">
                <Gauge className="w-3.5 h-3.5" />
                <span>{fps} FPS (AI: {aiFps})</span>
              </div>
            </>
          )}

          <button
            onClick={() => setShowGuideModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white text-xs font-medium transition cursor-pointer"
            title="Bảng điều khiển & Hướng dẫn cử chỉ"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Guide</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-900/80 border border-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            title="Toàn màn hình"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          {isStarted && (
            <button
              onClick={stopApp}
              className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition cursor-pointer"
              title="Dừng Camera & Audio"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-xl bg-slate-900/80 border border-cyan-500/40 hover:border-cyan-400 transition cursor-pointer text-xs"
              >
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-5 h-5 rounded-full border border-cyan-400 object-cover"
                />
                <span className="font-semibold text-slate-200 hidden sm:inline">
                  {user.name.split(" ")[0]}
                </span>
              </button>

              {showUserDropdown && (
                <div
                  className="absolute right-0 mt-2 w-48 bg-slate-900/95 border border-white/10 rounded-2xl p-2 shadow-2xl backdrop-blur-xl z-50 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-2 border-b border-white/10 mb-1">
                    <p className="font-semibold text-white truncate">{user.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setShowUserDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-red-500/10 text-red-400 transition text-left cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-semibold shadow-sm transition"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </header>

      {/* START SCREEN OVERLAY */}
      {!isStarted && (
        <div
          className="relative z-30 flex-1 flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-w-md w-full bg-slate-900/90 border border-white/10 rounded-3xl p-8 shadow-2xl text-center flex flex-col items-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-pink-500 p-1 mb-6 shadow-xl shadow-cyan-500/30">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Music className="w-10 h-10 text-cyan-400" />
              </div>
            </div>

            <h2 className="text-2xl font-bold tracking-tight mb-2 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Chơi Nhạc Bằng Cử Chỉ Tay
            </h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Kiến trúc siêu tốc độ 60 FPS: Nhận diện tay góc đa chiều, Wasm nội bộ
              không phụ thuộc CDN, hỗ trợ 7 Bậc âm và Pitch Shift tức thời.
            </p>

            {errorMessage && (
              <div className="w-full mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                {errorMessage}
              </div>
            )}

            <button
              onClick={startApp}
              disabled={isLoading}
              className="w-full py-4 px-6 rounded-2xl font-semibold text-white bg-gradient-to-r from-cyan-500 via-purple-600 to-pink-500 hover:opacity-95 active:scale-[0.98] transition shadow-lg shadow-purple-500/25 flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer text-base"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Đang tải mô hình & khởi động Audio Engine...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-white" />
                  <span>Bật Camera & Bắt Đầu (60 FPS)</span>
                </>
              )}
            </button>

            {/* Nút Xem Hướng Dẫn Chi Tiết */}
            <button
              onClick={() => {
                setShowGuideModal(true);
                setGuideActiveTab("quickstart");
              }}
              className="w-full mt-3 py-3 px-5 rounded-2xl font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>Xem Sổ Tay Hướng Dẫn Sử Dụng Chi Tiết 📖</span>
            </button>

            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <CameraIcon className="w-3.5 h-3.5 text-cyan-400" /> 60 FPS Render
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" /> Pitch Shift
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-pink-400" /> Zero Audio Latency
              </span>
            </div>
          </div>
        </div>
      )}

      {/* HUD OVERLAYS (WHEN RUNNING) */}
      {isStarted && (
        <div className="relative z-10 flex-1 pointer-events-none flex flex-col justify-between p-6">
          <div className="flex items-start justify-between gap-4">
            <div
              className="pointer-events-auto bg-slate-950/75 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-3.5 max-w-xs shadow-lg shadow-cyan-500/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                  Tay Trái (Hợp Âm)
                </span>
              </div>
              <p className="text-xs font-medium text-slate-200">
                {currentChord.gestureHint}
              </p>
            </div>

            <div
              className="pointer-events-auto bg-slate-950/75 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">
                  Pitch Shift
                </div>
                <div className="text-xs font-mono font-bold flex items-center gap-1 justify-end">
                  {currentChord.shift === 1 && (
                    <span className="text-emerald-400 flex items-center">
                      <ArrowUp className="w-3 h-3" /> Nâng Tông (+1#)
                    </span>
                  )}
                  {currentChord.shift === -1 && (
                    <span className="text-rose-400 flex items-center">
                      <ArrowDown className="w-3 h-3" /> Hạ Tông (-1♭)
                    </span>
                  )}
                  {currentChord.shift === 0 && (
                    <span className="text-slate-300">Tông Chuẩn (0)</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {showHelperSidebar && (
            <div
              className="pointer-events-auto self-start bg-slate-950/75 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 max-w-xs space-y-2.5 text-xs shadow-xl mt-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between text-slate-300 font-bold border-b border-white/10 pb-2">
                <span>7 BẬC ÂM (SCALE DEGREES)</span>
                <button
                  onClick={() => setShowHelperSidebar(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {Object.values(SCALE_DEGREES).map((deg) => {
                  const isActive = currentChord.degree === deg.degree;
                  return (
                    <div
                      key={deg.degree}
                      onClick={() => {
                        const chord = resolveChord(
                          deg.degree,
                          currentChord.isMinor,
                          currentChord.shift
                        );
                        setCurrentChord(chord);
                        activeChordKeyRef.current = `${deg.degree}-${currentChord.isMinor}-${currentChord.shift}`;
                        triggerChord(chord, 1.0);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        isActive
                          ? "bg-white/15 border-white/30 shadow"
                          : "bg-slate-900/50 border-white/5 opacity-70 hover:opacity-100"
                      }`}
                      style={{ borderLeftColor: deg.color, borderLeftWidth: "3px" }}
                    >
                      <div>
                        <div className="font-semibold text-slate-200">
                          {deg.fingerPattern}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {deg.baseMajorName} / {deg.baseMinorName}
                        </div>
                      </div>
                      <div
                        className="font-bold text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: `${deg.color}25`, color: deg.color }}
                      >
                        {deg.romanMajor}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CENTER-BOTTOM MASSIVE GLOWING CHORD BADGE */}
          <div
            className="pointer-events-auto flex flex-col items-center justify-center mb-6 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              triggerChord(currentChord, 1.0);
            }}
            title="Bấm vào để phát hợp âm này!"
          >
            <div
              className="relative px-12 py-5 rounded-3xl backdrop-blur-xl transition-all duration-300 flex flex-col items-center shadow-2xl border active:scale-95"
              style={{
                backgroundColor: `${currentChord.color}15`,
                borderColor: `${currentChord.color}60`,
                boxShadow: `0 0 50px ${currentChord.color}35`,
              }}
            >
              <div
                className="text-6xl sm:text-7xl font-black tracking-wider transition-all duration-200 select-none flex items-baseline gap-2"
                style={{
                  color: currentChord.color,
                  textShadow: `0 0 30px ${currentChord.color}90, 0 0 60px ${currentChord.color}50`,
                }}
              >
                <span>{currentChord.name}</span>
                <span className="text-2xl sm:text-3xl font-bold opacity-80">
                  ({currentChord.roman})
                </span>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs uppercase tracking-widest text-slate-400 font-medium">
                  {currentChord.isMinor ? "Hợp âm Thứ" : "Hợp âm Trưởng"}:
                </span>
                <div className="flex gap-1.5">
                  {currentChord.notes.map((note) => (
                    <span
                      key={note}
                      className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-white/10 border border-white/20 text-slate-200 shadow"
                    >
                      {note}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SỔ TAY HƯỚNG DẪN SỬ DỤNG CHI TIẾT (INTERACTIVE MASTERCLASS GUIDE)
         ========================================================================= */}
      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="bg-slate-900/95 border border-white/15 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-pink-500 p-0.5 shadow-md shadow-cyan-500/20">
                  <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Sổ Tay Hướng Dẫn Sử Dụng Gesture Synth</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      MASTER GUIDE
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Khám phá toàn bộ cử chỉ 7 bậc âm, nghiêng Major/Minor, Pitch Shift và các vòng hợp âm
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="flex items-center gap-1.5 px-6 py-2.5 border-b border-white/10 bg-slate-950/60 overflow-x-auto text-xs no-scrollbar">
              {[
                { id: "quickstart", label: "🚀 Bắt Đầu Nhanh" },
                { id: "degrees", label: "🖐️ 7 Bậc Cử Chỉ" },
                { id: "tilt", label: "🔄 Nghiêng Trưởng/Thứ" },
                { id: "pitch", label: "↕️ Pitch Shift" },
                { id: "chords", label: "🎵 Vòng Hợp Âm" },
                { id: "settings", label: "⚙️ Cài Đặt" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setGuideActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer text-xs flex items-center gap-1.5 ${
                    guideActiveTab === tab.id
                      ? "bg-gradient-to-r from-cyan-500/25 to-blue-600/25 border border-cyan-500/50 text-white shadow-md shadow-cyan-500/10 font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Modal Body with Sleek Custom Scrollbar */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              {/* TAB 1: BẮT ĐẦU NHANH & TƯ THẾ */}
              {guideActiveTab === "quickstart" && (
                <div className="space-y-5">
                  <div className="bg-gradient-to-r from-cyan-950/40 to-blue-950/40 border border-cyan-500/30 rounded-2xl p-4.5">
                    <h4 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>Ý Tưởng Cốt Lõi Của Nhạc Cụ</span>
                    </h4>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Gesture Synth biến đôi tay của bạn thành cây đàn đệm hợp âm tự động tương tự như đàn Ukulele.
                      Tay của bạn điều khiển phần hòa âm (Harmony) và nhạc đệm, trong khi bạn có thể tự do dùng giọng hát của mình để tạo nên giai điệu (Melody).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-4 space-y-2">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                        1
                      </div>
                      <h5 className="font-bold text-slate-200 text-xs">Khoảng Cách Camera</h5>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Ngồi cách webcam từ <strong>50cm đến 1m</strong>, đảm bảo bàn tay nằm gọn trong khung hình và phòng có đủ ánh sáng.
                      </p>
                    </div>

                    <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-4 space-y-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">
                        2
                      </div>
                      <h5 className="font-bold text-slate-200 text-xs">Tay Trái (Chọn Hợp Âm)</h5>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Giơ số ngón tay để chọn <strong>Bậc I đến Bậc VII</strong>. Nghiêng cổ tay để đổi giữa <strong>Trưởng (Major)</strong> và <strong>Thứ (Minor)</strong>.
                      </p>
                    </div>

                    <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-4 space-y-2">
                      <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-xs">
                        3
                      </div>
                      <h5 className="font-bold text-slate-200 text-xs">Tay Phải (Gảy Nốt & Filter)</h5>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Chụm ngón cái và ngón trỏ (<strong>Pinch 🤏</strong>) để phát âm. Nâng cao tay để âm thanh sáng rõ, hạ thấp tay để âm thanh trầm ấm.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/10 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200 text-xs">Mẹo tương tác linh hoạt:</div>
                      <div className="text-slate-400 text-[11px]">
                        Bạn có thể dùng <strong>1 bàn tay</strong> (hệ thống tự động phát khi đổi thế bấm hoặc cho phép búng ngón ngay trên tay đó) hoặc nhấp chuột lên màn hình để gảy nốt bất cứ lúc nào!
                      </div>
                    </div>
                    <button
                      onClick={() => triggerChord(currentChord, 1.0)}
                      className="px-3.5 py-2 rounded-xl bg-pink-500/20 border border-pink-500/40 text-pink-300 font-semibold text-xs hover:bg-pink-500/30 transition cursor-pointer whitespace-nowrap ml-3"
                    >
                      Thử Âm Ngay 🔊
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: 7 BẬC CỬ CHỈ NGÓN TAY */}
              {guideActiveTab === "degrees" && (
                <div className="space-y-4">
                  <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-4">
                    <h4 className="text-slate-200 font-bold text-xs mb-1 flex items-center gap-1.5">
                      <Music className="w-4 h-4 text-cyan-400" />
                      <span>Quy Ước Ngón Tay 7 Bậc Âm (Bấm vào thẻ để nghe thử âm thanh)</span>
                    </h4>
                    <p className="text-slate-400 text-[11px]">
                      Hệ thống đã cập nhật chính xác: <strong>3 ngón = Cái + Trỏ + Giữa</strong> và <strong>Ký hiệu Rock = Cái + Trỏ</strong>!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.values(SCALE_DEGREES).map((d) => {
                      const isCurrent = currentChord.degree === d.degree;
                      return (
                        <div
                          key={d.degree}
                          onClick={() => {
                            const chord = resolveChord(
                              d.degree,
                              currentChord.isMinor,
                              currentChord.shift
                            );
                            setCurrentChord(chord);
                            activeChordKeyRef.current = `${d.degree}-${currentChord.isMinor}-${currentChord.shift}`;
                            triggerChord(chord, 1.0);
                          }}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isCurrent
                              ? "bg-white/15 border-white/40 shadow-lg scale-[1.02]"
                              : "bg-slate-950/60 border-white/10 hover:border-white/20 hover:bg-slate-950/80"
                          }`}
                          style={{ borderLeftColor: d.color, borderLeftWidth: "4px" }}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-bold text-xs px-2 py-0.5 rounded-md"
                                style={{ backgroundColor: `${d.color}25`, color: d.color }}
                              >
                                Bậc {d.romanMajor}
                              </span>
                              <span className="font-bold text-slate-100 text-xs">
                                {d.fingerPattern}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">{d.fingerHint}</p>
                            <div className="text-[10px] font-mono text-slate-300">
                              Trưởng: <span className="text-cyan-300 font-bold">{d.baseMajorName}</span> ({d.majorNotes.join("-")}) • Thứ: <span className="text-pink-300 font-bold">{d.baseMinorName}</span>
                            </div>
                          </div>
                          <div className="text-right pl-2">
                            <button
                              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[10px] font-semibold transition"
                              title="Bấm để phát thử âm"
                            >
                              Phát 🔊
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: NGHIÊNG CỔ TAY (MAJOR / MINOR TILT) */}
              {guideActiveTab === "tilt" && (
                <div className="space-y-5">
                  <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-4.5 space-y-2">
                    <h4 className="text-slate-100 font-bold text-xs flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>Cơ Chế Nghiêng Cổ Tay Đổi Sắc Thái Âm Nhạc</span>
                    </h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Lấy cảm hứng từ phát minh gốc của Eric Wei: Thay vì dùng thêm các ngón tay phức tạp, bạn chỉ cần <strong>nghiêng cổ tay</strong> để chuyển đổi giữa hai thế giới âm thanh: <strong>Trưởng (Major)</strong> và <strong>Thứ (Minor)</strong> mà vẫn giữ nguyên số ngón tay!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Nghiêng Trong */}
                    <div className="bg-gradient-to-b from-cyan-950/30 to-slate-950 border border-cyan-500/40 rounded-2xl p-4.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-cyan-300">
                          ↪️ Nghiêng Vào Trong (Inward)
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          MAJOR (TRƯỞNG)
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-slate-300 space-y-1.5">
                        <div>
                          👉 <strong>Động tác:</strong> Nghiêng bàn tay hướng vào giữa cơ thể (về phía bên phải màn hình gương).
                        </div>
                        <div>
                          🎶 <strong>Sắc thái:</strong> Âm hưởng tươi vui, trong sáng, tràn đầy hy vọng.
                        </div>
                        <div>
                          🏷️ <strong>Ký hiệu:</strong> C, D, E, F, G, A, B.
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const chord = resolveChord(currentChord.degree, false, currentChord.shift);
                          setCurrentChord(chord);
                          activeChordKeyRef.current = `${chord.degree}-false-${chord.shift}`;
                          triggerChord(chord, 1.0);
                        }}
                        className="w-full py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition cursor-pointer"
                      >
                        Thử Âm Hợp Âm Trưởng (Major) 🔊
                      </button>
                    </div>

                    {/* Nghiêng Ngoài */}
                    <div className="bg-gradient-to-b from-pink-950/30 to-slate-950 border border-pink-500/40 rounded-2xl p-4.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-pink-300">
                          ↩️ Nghiêng Ra Ngoài (Outward)
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/40">
                          MINOR (THỨ)
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-slate-300 space-y-1.5">
                        <div>
                          👉 <strong>Động tác:</strong> Nghiêng bàn tay hướng ra phía ngoài cơ thể (về phía bên trái màn hình gương).
                        </div>
                        <div>
                          🎶 <strong>Sắc thái:</strong> Âm hưởng sâu lắng, cảm xúc, trầm buồn, da diết.
                        </div>
                        <div>
                          🏷️ <strong>Ký hiệu:</strong> Cm, Dm, Em, Fm, Gm, Am, Bm.
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const chord = resolveChord(currentChord.degree, true, currentChord.shift);
                          setCurrentChord(chord);
                          activeChordKeyRef.current = `${chord.degree}-true-${chord.shift}`;
                          triggerChord(chord, 1.0);
                        }}
                        className="w-full py-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 text-xs font-semibold transition cursor-pointer"
                      >
                        Thử Âm Hợp Âm Thứ (Minor) 🔊
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-white/10 text-[11px] text-slate-400">
                    💡 <strong>Đặc điểm thông minh:</strong> Hệ thống tích hợp dải đệm chết (Deadband Hysteresis ±10°). Khi bạn giữ tay ở góc giữa, trạng thái Trưởng hoặc Thứ gần nhất sẽ được khóa ổn định, không bị nhảy chập chờn khi di chuyển tay.
                  </div>
                </div>
              )}

              {/* TAB 4: PITCH SHIFT TRỤC Y */}
              {guideActiveTab === "pitch" && (
                <div className="space-y-5">
                  <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-4.5 space-y-2">
                    <h4 className="text-slate-100 font-bold text-xs flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      <span>Tính Năng Pitch Shift Tức Thời Theo Độ Cao Cổ Tay</span>
                    </h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Bằng cách đưa cổ tay lên cao hoặc hạ xuống thấp trong không gian camera, bạn có thể biến đổi toàn bộ hợp âm lên hoặc xuống nửa cung (semitone) theo công thức nhạc lý:
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        <ArrowUp className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-emerald-300 text-xs flex items-center gap-2">
                          <span>Vùng Nâng Tông (y &lt; 0.22) → Tăng Nửa Cung (+1 Semitone #)</span>
                        </div>
                        <p className="text-slate-300 text-[11px] mt-1">
                          Đưa bàn tay lên 1/4 phía trên khung hình camera. Ví dụ: <span className="font-mono font-bold text-white">C ➜ C#</span>, <span className="font-mono font-bold text-white">D ➜ D#</span>, <span className="font-mono font-bold text-white">F ➜ F#</span>, <span className="font-mono font-bold text-white">Am ➜ A#m</span>.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        ●
                      </div>
                      <div>
                        <div className="font-bold text-slate-200 text-xs">
                          Vùng Giữa (0.22 ≤ y ≤ 0.78) → Tông Chuẩn Gốc (Natural)
                        </div>
                        <p className="text-slate-300 text-[11px] mt-1">
                          Để tay ở độ cao tự nhiên ngang ngực. Hợp âm giữ nguyên tông chuẩn cơ bản ban đầu.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        <ArrowDown className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-rose-300 text-xs flex items-center gap-2">
                          <span>Vùng Hạ Tông (y &gt; 0.78) → Giảm Nửa Cung (-1 Semitone ♭)</span>
                        </div>
                        <p className="text-slate-300 text-[11px] mt-1">
                          Hạ bàn tay xuống gần mép dưới màn hình. Ví dụ: <span className="font-mono font-bold text-white">D ➜ D♭</span>, <span className="font-mono font-bold text-white">E ➜ E♭</span>, <span className="font-mono font-bold text-white">G ➜ G♭</span>, <span className="font-mono font-bold text-white">Am ➜ A♭m</span>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: VÒNG HỢP ÂM & BÀI HÁT MẪU */}
              {guideActiveTab === "chords" && (
                <div className="space-y-4">
                  <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-4">
                    <h4 className="text-slate-200 font-bold text-xs mb-1 flex items-center gap-1.5">
                      <Music className="w-4 h-4 text-cyan-400" />
                      <span>Các Vòng Hợp Âm Hit Thế Giới & Cách Bấm Tay</span>
                    </h4>
                    <p className="text-slate-400 text-[11px]">
                      Thực hành ngay với các bài hát quen thuộc bằng chuỗi cử chỉ tay đơn giản:
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* Vòng 1: Pop Ballad */}
                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-cyan-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-white text-xs">
                          🌟 1. Vòng Pop Ballad Quốc Dân (C - G - Am - F)
                        </div>
                        <span className="text-[10px] text-cyan-400 font-mono">Bậc I - V - VI - IV</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300">☝️ C</span>
                        <span>➜</span>
                        <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-300">🖐️ G</span>
                        <span>➜</span>
                        <span className="px-2 py-1 rounded bg-pink-500/20 text-pink-300">👆+👍 Am (Rock)</span>
                        <span>➜</span>
                        <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-300">🖖 F</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        <strong>Bài hát mẫu:</strong> <em>Let It Be, Someone Like You (Adele), Counting Stars (OneRepublic), Price Tag</em>.
                      </p>
                    </div>

                    {/* Vòng 2: EDM Hiện Đại */}
                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-pink-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-white text-xs">
                          🔥 2. Vòng EDM Cảm Xúc (Am - F - C - G)
                        </div>
                        <span className="text-[10px] text-pink-400 font-mono">Bậc VI - IV - I - V</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <span className="px-2 py-1 rounded bg-pink-500/20 text-pink-300">👆+👍 Am (Rock)</span>
                        <span>➜</span>
                        <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-300">🖖 F</span>
                        <span>➜</span>
                        <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300">☝️ C</span>
                        <span>➜</span>
                        <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-300">🖐️ G</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        <strong>Bài hát mẫu:</strong> <em>Faded (Alan Walker), Despacito, Nơi Này Có Anh, The Nights (Avicii)</em>.
                      </p>
                    </div>

                    {/* Vòng 3: Cổ Điển Doo-Wop */}
                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-purple-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-white text-xs">
                          💖 3. Vòng Cổ Điển Lãng Mạn (C - Am - F - G)
                        </div>
                        <span className="text-[10px] text-purple-400 font-mono">Bậc I - VI - IV - V</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300">☝️ C</span>
                        <span>➜</span>
                        <span className="px-2 py-1 rounded bg-pink-500/20 text-pink-300">👆+👍 Am (Rock)</span>
                        <span>➜</span>
                        <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-300">🖖 F</span>
                        <span>➜</span>
                        <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-300">🖐️ G</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        <strong>Bài hát mẫu:</strong> <em>Stand By Me, Perfect (Ed Sheeran), Baby (Justin Bieber)</em>.
                      </p>
                    </div>

                    {/* Vòng 4: Chill Lofi */}
                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-white text-xs">
                          ☕ 4. Vòng Chillout Lofi 2 Hợp Âm (C - Am)
                        </div>
                        <span className="text-[10px] text-emerald-400 font-mono">Bậc I ⇆ Bậc VI</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300">☝️ C (1 Ngón)</span>
                        <span>⇆</span>
                        <span className="px-2 py-1 rounded bg-pink-500/20 text-pink-300">👆+👍 Am (Rock: Cái + Trỏ)</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Chuyển đổi qua lại nhịp nhàng sau mỗi 4 phách nhịp để tạo nền nhạc thư giãn (Chill/Study).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: CÀI ĐẶT & TÙY CHỈNH */}
              {guideActiveTab === "settings" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Playing Mode */}
                    <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-4 space-y-2.5">
                      <div className="font-semibold text-slate-200 flex items-center justify-between text-xs">
                        <span>Chế Độ Chơi (Playing Mode)</span>
                        <Layers className="w-4 h-4 text-purple-400" />
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        {playMode === "two-handed"
                          ? "Đang ở chế độ 2 Tay: Tay trái chọn hợp âm, tay phải búng ngón (Pinch) gảy nốt & quét Filter."
                          : "Đang ở chế độ 1 Tay: Tự động gảy nốt mỗi khi chuyển thế ngón tay trái."}
                      </p>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setPlayMode("two-handed")}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition ${
                            playMode === "two-handed"
                              ? "bg-purple-500/25 border-purple-500 text-purple-300 shadow"
                              : "bg-slate-900 border-white/10 text-slate-400 hover:text-white"
                          }`}
                        >
                          2 Tay (Two-Handed)
                        </button>
                        <button
                          onClick={() => setPlayMode("left-only")}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition ${
                            playMode === "left-only"
                              ? "bg-cyan-500/25 border-cyan-500 text-cyan-300 shadow"
                              : "bg-slate-900 border-white/10 text-slate-400 hover:text-white"
                          }`}
                        >
                          1 Tay (Tự Động)
                        </button>
                      </div>
                    </div>

                    {/* Pitch Shift Toggle */}
                    <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-4 space-y-2.5">
                      <div className="font-semibold text-slate-200 flex items-center justify-between text-xs">
                        <span>Tính Năng Pitch Shift (Trục Y)</span>
                        <Zap className="w-4 h-4 text-emerald-400" />
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Cho phép nâng (+1#) hoặc hạ (-1♭) nửa cung theo vị trí cao thấp của cổ tay.
                      </p>
                      <button
                        onClick={() => setPitchShiftEnabled(!pitchShiftEnabled)}
                        className={`w-full py-2 rounded-xl text-xs font-semibold border cursor-pointer transition ${
                          pitchShiftEnabled
                            ? "bg-emerald-500/25 border-emerald-500 text-emerald-300 shadow"
                            : "bg-slate-900 border-white/10 text-slate-400 hover:text-white"
                        }`}
                      >
                        {pitchShiftEnabled ? "✓ Đang BẬT Pitch Shift" : "✕ Đang TẮT Pitch Shift"}
                      </button>
                    </div>

                    {/* Auto Strum */}
                    <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-4 space-y-2.5">
                      <div className="font-semibold text-slate-200 flex items-center justify-between text-xs">
                        <span>Tự Động Gảy Nốt (Auto-Strum)</span>
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Tự động phát ra âm thanh ngay khi cử chỉ tay đổi sang hợp âm mới.
                      </p>
                      <button
                        onClick={() => setAutoStrum(!autoStrum)}
                        className={`w-full py-2 rounded-xl text-xs font-semibold border cursor-pointer transition ${
                          autoStrum
                            ? "bg-cyan-500/25 border-cyan-500 text-cyan-300 shadow"
                            : "bg-slate-900 border-white/10 text-slate-400 hover:text-white"
                        }`}
                      >
                        {autoStrum ? "✓ Đang BẬT Tự Động Gảy" : "✕ Đang TẮT Tự Động Gảy"}
                      </button>
                    </div>

                    {/* Sound Presets */}
                    <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-4 space-y-2.5">
                      <div className="font-semibold text-slate-200 flex items-center justify-between text-xs">
                        <span>Âm Sắc Nhạc Cụ (Sound Preset)</span>
                        <Sliders className="w-4 h-4 text-pink-400" />
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Chọn phong cách âm thanh: Bay bổng (Ethereal), Cổ điển 8-bit (Retro), hoặc Đàn hạc (Harp).
                      </p>
                      <div className="flex gap-2">
                        {(["ethereal", "retro", "harp"] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => applyPreset(p)}
                            className={`flex-1 py-2 rounded-xl capitalize text-xs font-semibold border cursor-pointer transition ${
                              soundPreset === p
                                ? "bg-gradient-to-r from-pink-500 to-rose-600 border-transparent text-white shadow"
                                : "bg-slate-900 border-white/10 text-slate-400 hover:text-white"
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-white/10 bg-slate-950/60 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                Nhấn phím <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-white/20 text-[10px] font-mono text-white">ESC</kbd> hoặc bấm nút bên để đóng
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold text-white text-xs shadow-lg cursor-pointer hover:opacity-90 active:scale-95 transition"
              >
                Đã Rõ, Vào Chơi Nhạc Ngay 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
