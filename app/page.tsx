"use client";

import dynamic from "next/dynamic";

// Disable SSR since Web Audio API and MediaPipe Camera require client-side browser globals
const GestureSynth = dynamic(() => import("./components/GestureSynth"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
      <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-sm font-medium tracking-wide">Đang khởi tạo Gesture Synth Web App...</p>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="w-full h-screen overflow-hidden bg-slate-950">
      <GestureSynth />
    </main>
  );
}