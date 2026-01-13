
import React, { useState, useRef, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI, Modality } from "@google/genai";

// --- Data ---
const LOADING_QUOTES = [
  { text: "Whatever a mother, father, or other relative might do for you, a well-directed mind does better.", source: "Buddha, Dhammapada, Verse 43" },
  { text: "Drop by drop is the water pot filled. Likewise, the wise man, gathering it little by little, fills himself with good.", source: "Buddha, Dhammapada, Verse 122" },
  { text: "Irrigators channel waters; fletchers straighten arrows; carpenters bend wood; the wise master themselves.", source: "Buddha, Dhammapada, Verse 80" },
  { text: "Just as a solid rock is not shaken by the storm, even so the wise are not affected by praise or blame.", source: "Buddha, Dhammapada, Verse 81" },
  { text: "There is no fear for one whose mind is not filled with desires.", source: "Buddha, Dhammapada, Verse 39" },
  { text: "Mind precedes all mental states. Mind is their chief; they are all mind-wrought.", source: "Buddha, Dhammapada, Verse 1" },
];

const JOURNAL_ESSAYS = [
  {
    title: "The Empty Cup",
    text: "To fill a cup that is already full is impossible. By releasing these thoughts, you have not lost anything; you have simply poured out the old tea. The space you feel right now is not emptiness—it is potential. It is room for the new moment to enter. Enjoy this lightness. The heavy lifting is done."
  },
  {
    title: "The Heavy Backpack",
    text: "Imagine you have been hiking up a mountain carrying a backpack full of stones. Every worry you just wrote down was a stone. You have just set the bag down on the side of the trail. Your shoulders are lighter. Your breath is deeper. You can walk forward now without that weight pulling you backward. You are free to move."
  },
  {
    title: "Mental RAM",
    text: "Your mind is a processor, not a storage unit. When you hold onto these loops, they run in the background, consuming your energy and slowing you down. By writing them and burning them, you have closed those tabs. The process is terminated. Your system is clear. You have permission to focus only on what is right in front of you."
  },
  {
    title: "The River",
    text: "A river does not try to hold onto the water that flows past it. If it did, it would become a stagnant swamp. You are the riverbed, and these thoughts are just the water. They have rushed past you, and now they are downstream, drifting toward the ocean. Let them go. Watch them disappear around the bend."
  },
  {
    title: "The Storm",
    text: "The sky does not apologize for the storm, and it does not hold onto the clouds after they pass. It simply allows the weather to happen, knowing it is vast enough to handle it. You are the sky, not the weather. The thunder has rumbled, the rain has fallen, and now the clouds are breaking. Enjoy the clear blue that remains."
  },
  {
    title: "The Dead Leaves",
    text: "In a forest, trees do not cling to dead leaves out of nostalgia or fear. They drop them to the forest floor to disintegrate. This shedding is not a loss; it is the only way to survive the winter and prepare for spring. You have just shed a dead leaf. Do not pick it back up. Let it become the soil for your next growth."
  },
  {
    title: "The Clenched Fist",
    text: "Holding onto anger or worry is like grasping a hot coal with the intent of throwing it at someone else; you are the one who gets burned. It requires immense energy to keep your fist clenched tight. By releasing this text, you have opened your hand. Feel the blood return to your fingers. Feel the energy you just saved."
  },
  {
    title: "The Train Station",
    text: "Imagine your mind is a busy train station. Thoughts are simply trains pulling in and out. For a long time, you have been jumping onto every train that arrives, letting it take you miles away from where you want to be. Not this time. You just watched the train arrive, and you watched it leave. You are still standing safely on the platform."
  },
  {
    title: "The Editor",
    text: "We often mistake our anxious thoughts for facts, but they are usually just drafts of a story we are writing in our heads. You are the author, not the character. You just looked at a draft that wasn't working, and you crumpled it up. It is not part of your final story. Turn the page. The next chapter is blank."
  },
  {
    title: "The Glass",
    text: "If you hold a glass of water for a minute, it is light. If you hold it for an hour, your arm aches. If you hold it all day, you become paralyzed. The weight of the glass doesn't change, but the longer you hold it, the heavier it becomes. You have just put the glass down. Rest your arm. The water is no longer your concern."
  }
];

// --- Audio Utilities ---
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

async function generateSpeech(text: string, ctx: AudioContext): Promise<AudioBuffer> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
    },
  });
  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Audio generation failed");
  
  const decodedData = decode(base64Audio);
  return await decodeAudioData(decodedData, ctx, 24000, 1);
}

// --- Icons & Components ---

const FormattedText = ({ text }: { text: string }) => {
  if (!text) return null;
  const boldParts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {boldParts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-bold text-stone-300">{part.slice(2, -2)}</strong>;
        }
        const italicParts = part.split(/(\*.*?\*)/g);
        return (
          <span key={i}>
            {italicParts.map((subPart, j) => {
              if (subPart.startsWith('*') && subPart.endsWith('*')) {
                return <em key={j} className="italic text-[#d4af37]/80">{subPart.slice(1, -1)}</em>;
              }
              return subPart;
            })}
          </span>
        );
      })}
    </>
  );
};

const LotusIcon = ({ size = 24, className = "", isErasing = false }: { size?: number, className?: string, isErasing?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round" className={`${className} ${isErasing ? 'erasing' : ''}`}>
    <path className="erase-path p1" d="M12 2C12 2 16 8 16 12C16 16 12 22 12 22C12 22 8 16 8 12C8 8 12 2 12 2Z" />
    <path className="erase-path p2" d="M12 22C12 22 17 18 20 15C23 12 20 8 18 8" />
    <path className="erase-path p3" d="M12 22C12 22 7 18 4 15C1 12 4 8 6 8" />
  </svg>
);

const HeadphoneIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" className={className}>
    <path d="M4 14c0-4.418 3.582-8 8-8s8 3.582 8 8v3.5a2.5 2.5 0 0 1-5 0V15a2.5 2.5 0 0 1 5 0M4 14v3.5a2.5 2.5 0 0 0 5 0V15a2.5 2.5 0 0 0-5 0" />
    <path d="M12 6V3" />
  </svg>
);

const CameraIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const MicIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const XIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const FireIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.1.2-2.2.6-3.3a1 1 0 0 0 3 2.8z"/>
  </svg>
);

const BreathIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="9" opacity="0.4" />
    <circle cx="12" cy="12" r="5" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2" opacity="0.3" />
  </svg>
);

const ChatIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const HourglassIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 22h14" />
    <path d="M5 2h14" />
    <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
    <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
  </svg>
);

type BreathingPhase = 'inhale' | 'hold' | 'exhale' | 'hold-empty' | 'idle' | 'countdown';

const MorphingHeaderIcon = ({ mode, className = "" }: { mode: 'chat' | 'breathe' | 'journal' | 'focus', className?: string }) => {
  const isJournal = mode === 'journal';
  const isBreathe = mode === 'breathe';
  const isFocus = mode === 'focus';
  const baseClass = "transition-all duration-700 ease-in-out absolute inset-0";
  
  return (
    <div className={`relative ${className}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.0" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
            <g className={`${baseClass} ${isJournal ? 'opacity-100' : 'opacity-0'}`} 
               style={{ strokeDasharray: 1, strokeDashoffset: isJournal ? 0 : 1 }}>
                <path pathLength="1" d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.1.2-2.2.6-3.3a1 1 0 0 0 3 2.8z"/>
            </g>
            <g className={`${baseClass} ${isBreathe ? 'opacity-100' : 'opacity-0'}`} 
               style={{ strokeDasharray: 1, strokeDashoffset: isBreathe ? 0 : 1 }}>
                 <circle pathLength="1" cx="12" cy="12" r="9" opacity="0.4" />
                 <circle pathLength="1" cx="12" cy="12" r="5" />
            </g>
             <g className={`${baseClass} ${isFocus ? 'opacity-100' : 'opacity-0'}`} 
                style={{ strokeDasharray: 1, strokeDashoffset: isFocus ? 0 : 1 }}>
                <path pathLength="1" d="M5 22h14" />
                <path pathLength="1" d="M5 2h14" />
                <path pathLength="1" d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
                <path pathLength="1" d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
             </g>
        </svg>
    </div>
  );
};

const HeaderControls = ({ isMusic, toggleMusic, isVoice, toggleVoice, onAboutClick, hidden }: { isMusic: boolean, toggleMusic: () => void, isVoice: boolean, toggleVoice: () => void, onAboutClick: () => void, hidden?: boolean }) => {
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setShowAudioMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 z-50 flex gap-3 items-center transition-all duration-1000 animate-in fade-in zoom-in-95 ${hidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className="relative" ref={menuRef}>
        <button onClick={(e) => { e.stopPropagation(); setShowAudioMenu(!showAudioMenu); }} className={`p-3 rounded-full border backdrop-blur-md transition-all duration-300 group ${showAudioMenu || isMusic || isVoice ? 'text-[#d4af37] bg-stone-900/40 border-[#d4af37]/30' : 'text-stone-600 bg-transparent border-stone-800/50 hover:text-stone-400 hover:border-stone-700'}`} aria-label="Audio Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
        </button>
        {showAudioMenu && (
          <div className="absolute top-full right-0 mt-3 w-48 bg-[#12100e]/95 backdrop-blur-xl border border-stone-800 rounded-2xl shadow-2xl overflow-hidden z-[60] animate-in slide-in-from-top-2 fade-in duration-200">
             <div className="py-2">
                <button onClick={(e) => { e.stopPropagation(); toggleMusic(); }} className="w-full px-4 py-3 flex items-center justify-between hover:bg-stone-800/30 transition-colors group">
                   <div className="flex items-center gap-3">
                      <span className={`text-[#d4af37] transition-opacity ${isMusic ? 'opacity-100' : 'opacity-40'}`}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></span>
                      <span className={`text-[10px] uppercase tracking-widest font-serif ${isMusic ? 'text-stone-200' : 'text-stone-500'}`}>Ambience</span>
                   </div>
                   <div className={`w-1.5 h-1.5 rounded-full transition-all ${isMusic ? 'bg-[#d4af37] shadow-[0_0_8px_#d4af37]' : 'bg-stone-800'}`} />
                </button>
                <div className="h-[1px] bg-stone-800/50 mx-4" />
                <button onClick={(e) => { e.stopPropagation(); toggleVoice(); }} className="w-full px-4 py-3 flex items-center justify-between hover:bg-stone-800/30 transition-colors group">
                   <div className="flex items-center gap-3">
                      <span className={`text-[#d4af37] transition-opacity ${isVoice ? 'opacity-100' : 'opacity-40'}`}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg></span>
                      <span className={`text-[10px] uppercase tracking-widest font-serif ${isVoice ? 'text-stone-200' : 'text-stone-500'}`}>Voice</span>
                   </div>
                   <div className={`w-1.5 h-1.5 rounded-full transition-all ${isVoice ? 'bg-[#d4af37] shadow-[0_0_8px_#d4af37]' : 'bg-stone-800'}`} />
                </button>
             </div>
          </div>
        )}
      </div>
      <div className="w-[1px] h-8 bg-stone-800/50" />
      <button onClick={(e) => { e.stopPropagation(); onAboutClick(); }} className="p-3 rounded-full border border-stone-800/50 backdrop-blur-md transition-all duration-300 group text-stone-600 bg-transparent hover:text-[#d4af37] hover:border-[#d4af37]/50" aria-label="About">
          <span className="font-serif italic font-bold text-lg leading-none w-4 h-4 flex items-center justify-center">i</span>
      </button>
    </div>
  );
};

const AboutModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => (
  <div className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-xl transition-all duration-500 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={onClose}>
    <div className={`relative w-[90%] md:w-[80%] max-w-2xl max-h-[85vh] overflow-y-auto p-8 md:p-12 bg-[#12100e]/80 border border-stone-800/50 shadow-2xl rounded-sm scrollbar-hide transition-all duration-500 ease-out ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`} onClick={e => e.stopPropagation()}>
      <button onClick={onClose} className="absolute top-6 right-6 text-stone-500 hover:text-[#d4af37] transition-colors"><XIcon className="w-6 h-6" /></button>
      <div className="flex flex-col items-center text-center font-serif text-stone-300 space-y-10">
        <div><div className="w-16 h-16 mx-auto mb-6 text-[#d4af37] opacity-80"><LotusIcon size={64} /></div><h2 className="text-2xl md:text-3xl text-[#d4af37] tracking-[0.2em] uppercase">The Silent Temple</h2></div>
        <div className="space-y-4 w-full border-b border-stone-800/50 pb-8">
           <div><h3 className="text-[#d4af37] text-sm uppercase tracking-widest mb-1 opacity-90">The Chat</h3><p className="text-stone-400 italic font-light">"A mirror for your thoughts. Guided by wisdom."</p></div>
           <div><h3 className="text-[#d4af37] text-sm uppercase tracking-widest mb-1 opacity-90">The Focus</h3><p className="text-stone-400 italic font-light">"Time is a circle. Work and rest in harmony."</p></div>
           <div><h3 className="text-[#d4af37] text-sm uppercase tracking-widest mb-1 opacity-90">The Burner Journal</h3><p className="text-stone-400 italic font-light">"An offering to the fire. Write and release."</p></div>
        </div>
        <div className="space-y-6 text-sm md:text-base leading-[1.8] font-light text-stone-300/90 text-justify md:text-center"><p>In an era of digital permanence, the mind deserves a space for the ephemeral. Zen Monk exists as a necessary rebellion—an architecture of absence designed to return the individual to the stillness that exists before the noise of the world intervenes.</p><p>True clarity is found not by seeking an answer, but by surrendering the need for one. Growth is found in the shedding of burdens, not the collection of them.</p></div>
        <div className="pt-4 opacity-50"><span className="text-xs uppercase tracking-[0.3em]">Yours</span></div>
      </div>
    </div>
  </div>
);

const MonkAvatar = ({ isActive, isEntering }: { isActive: boolean, isEntering: boolean }) => (
  <div className={`relative w-32 h-32 md:w-64 md:h-64 mx-auto transition-all duration-[4000ms] ${isEntering ? 'monk-entrance' : ''}`}>
    <div className={`aura absolute inset-0 rounded-full bg-[#d4af37] blur-[60px] opacity-10`} />
    <div className={`absolute inset-0 rounded-full bg-[#d4af37] blur-[100px] transform-gpu transition-all ${isActive ? 'opacity-20 scale-125 duration-[2500ms] ease-out' : 'opacity-0 scale-100 duration-300 ease-in'}`} />
    <svg viewBox="0 0 200 200" className="relative z-10 w-full h-full">
      <path className="monk-breathing" d="M45,170 C45,135 65,110 100,110 C135,110 155,135 155,170 L155,190 L45,190 Z" fill="#1c1917" stroke="#292524" strokeWidth="0.5" />
      <g><circle cx="100" cy="75" r="32" fill="#0c0a09" stroke="#1c1917" strokeWidth="0.5" /><g className="transition-all duration-[2000ms]" style={{ opacity: isActive ? 0.8 : 0.2 }}><circle cx="100" cy="62" r="1.2" fill="#d4af37" opacity="0.4" /><path d="M85,76 Q91,77.5 97,76" fill="none" stroke="#d4af37" strokeWidth="0.6" strokeLinecap="round" /><path d="M103,76 Q109,77.5 115,76" fill="none" stroke="#d4af37" strokeWidth="0.6" strokeLinecap="round" /><path d="M94,90 Q100,92.5 106,90" fill="none" stroke="#d4af37" strokeWidth="0.5" strokeLinecap="round" /><circle cx="86" cy="86" r="3" fill="#d4af37" opacity={isActive ? 0.05 : 0} /><circle cx="114" cy="86" r="3" fill="#d4af37" opacity={isActive ? 0.05 : 0} /></g></g>
      <path d="M88,130 Q100,126 112,130" fill="none" stroke="#1c1917" strokeWidth="0.8" opacity="0.1" />
    </svg>
  </div>
);

const TypewriterText = ({ text, isStreaming, onDone }: { text: string; isStreaming?: boolean; onDone?: () => void }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(text.substring(0, index + 1));
        setIndex(prev => prev + 1);
      }, 30);
      return () => clearTimeout(timeout);
    } else if (!isStreaming && onDone) onDone();
  }, [index, text, isStreaming, onDone]);
  return <span className={index < text.length ? "typewriter-cursor" : ""}><FormattedText text={displayedText} /></span>;
};

// --- View Components ---

const PomodoroView = ({ isActive, onTimerComplete, onRestoreComplete, onStart }: { isActive: boolean, onTimerComplete: () => void, onRestoreComplete: () => void, onStart: () => void }) => {
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [isRunning, setIsRunning] = useState(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [iterations, setIterations] = useState(4); 
  const [currentIteration, setCurrentIteration] = useState(1);
  const [timeLeft, setTimeLeft] = useState(workDuration * 60);
  const totalTimeRef = useRef(workDuration * 60);
  const totalDurationMins = iterations * (workDuration + breakDuration);
  const totalHours = Math.floor(totalDurationMins / 60);
  const totalMins = totalDurationMins % 60;
  const totalTimeString = totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`;

  useEffect(() => {
    if (!isRunning && !showPauseMenu) {
       const duration = mode === 'work' ? workDuration : breakDuration;
       setTimeLeft(duration * 60);
       totalTimeRef.current = duration * 60;
       setCurrentIteration(1);
       setMode('work');
    }
  }, [workDuration, breakDuration, iterations, isRunning, showPauseMenu]);

  useEffect(() => { if (!isActive) { setIsRunning(false); setShowPauseMenu(false); } }, [isActive]);

  useEffect(() => {
    let interval: number;
    if (isRunning && isActive && !showPauseMenu) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (mode === 'work') { onTimerComplete(); setMode('break'); totalTimeRef.current = breakDuration * 60; return breakDuration * 60; }
            else {
               onRestoreComplete();
               if (currentIteration < iterations) { setCurrentIteration(c => c + 1); setMode('work'); totalTimeRef.current = workDuration * 60; return workDuration * 60; }
               else { setIsRunning(false); setMode('work'); setCurrentIteration(1); totalTimeRef.current = workDuration * 60; return workDuration * 60; }
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isActive, mode, iterations, currentIteration, workDuration, breakDuration, onTimerComplete, onRestoreComplete, showPauseMenu]);

  const toggleTimer = () => { if (!isRunning) { onStart(); setIsRunning(true); } else setShowPauseMenu(true); };
  const handleReset = () => { setIsRunning(false); setShowPauseMenu(false); setTimeLeft((mode === 'work' ? workDuration : breakDuration) * 60); setCurrentIteration(1); };
  const formatTime = (seconds: number) => { const mins = Math.floor(seconds / 60); const secs = seconds % 60; return `${mins}:${secs.toString().padStart(2, '0')}`; };
  const progress = Math.max(0, Math.min(1, (totalTimeRef.current - timeLeft) / totalTimeRef.current));

  return (
    <div className="flex flex-col items-center justify-center h-full w-full relative animate-in fade-in duration-1000">
      <style>{`@keyframes drift { from { transform: translateX(0); } to { transform: translateX(-200px); } }`}</style>
      <div className={`relative w-72 h-72 md:w-96 md:h-96 cursor-pointer group select-none tap-highlight-transparent transition-transform duration-500 ${showPauseMenu ? 'scale-90 blur-sm opacity-50' : 'scale-100'}`} onClick={toggleTimer}>
         <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]">
            <clipPath id="liquidMask"><circle cx="100" cy="100" r="90" /></clipPath>
            <g clipPath="url(#liquidMask)"><circle cx="100" cy="100" r="100" fill="#0c0a09" /><g style={{ transform: `translateY(${200 * (1 - progress)}px)`, transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)' }}><path d="M0,10 Q50,-5 100,10 T200,10 T300,10 T400,10 V300 H0 Z" fill={mode === 'work' ? "#854d0e" : "#44403c"} opacity="0.4" style={{ animation: 'drift 10s infinite linear' }} /><path d="M0,5 Q50,15 100,5 T200,5 T300,5 T400,5 V300 H0 Z" fill={mode === 'work' ? "#d4af37" : "#a8a29e"} opacity="0.9" style={{ animation: 'drift 6s infinite linear reverse' }} /></g></g>
            <circle cx="100" cy="100" r="90" fill="none" stroke="#292524" strokeWidth="4" /><circle cx="100" cy="100" r="84" fill="none" stroke={mode === 'work' ? "#d4af37" : "#a8a29e"} strokeWidth="0.5" opacity="0.3" />
         </svg>
         <div className="absolute inset-0 flex flex-col items-center justify-center"><div className="flex flex-col items-center"><span className={`text-[10px] uppercase tracking-[0.4em] mb-4 transition-opacity duration-300 ${mode === 'work' ? 'text-[#d4af37]' : 'text-stone-400'} ${isRunning ? 'opacity-100' : 'opacity-0'}`}>{mode === 'work' ? 'Focus' : 'Restore'}</span><span className={`font-serif text-6xl text-stone-200 tracking-wider transition-all duration-700 ${isRunning ? 'opacity-0 group-hover:opacity-100 blur-sm group-hover:blur-0 scale-95' : 'opacity-100 scale-100 blur-0'}`}>{formatTime(timeLeft)}</span><div className="h-6 mt-6 relative w-full flex justify-center"><span className={`absolute text-[9px] uppercase tracking-[0.2em] text-stone-600 group-hover:text-[#d4af37] transition-all duration-500 ${isRunning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>Tap to Begin</span><span className={`absolute text-[9px] uppercase tracking-[0.2em] text-stone-500 transition-all duration-500 ${isRunning ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>Cycle {currentIteration} / {iterations}</span></div></div></div>
      </div>
      {showPauseMenu && (
        <div className="absolute inset-0 z-50 flex items-center justify-center animate-in fade-in zoom-in-95 duration-500"><div className="bg-[#12100e]/90 backdrop-blur-2xl border border-stone-800 rounded-full w-64 h-64 md:w-80 md:h-80 flex flex-col items-center justify-center shadow-2xl"><h2 className="text-[#d4af37] font-serif text-xl tracking-[0.3em] uppercase mb-8 opacity-90">Stillness</h2><div className="flex flex-col gap-4 w-full px-12"><button onClick={(e) => { e.stopPropagation(); setShowPauseMenu(false); }} className="w-full py-3 border border-[#d4af37]/40 text-[#d4af37] text-[10px] uppercase tracking-[0.3em] rounded-full hover:bg-[#d4af37]/10 transition-all">Continue</button><button onClick={(e) => { e.stopPropagation(); handleReset(); }} className="w-full py-3 border border-stone-800 text-stone-500 text-[10px] uppercase tracking-[0.3em] rounded-full hover:text-stone-300 transition-all">Reset Session</button></div></div></div>
      )}
      <div className={`mt-8 md:mt-12 flex flex-col gap-8 transition-all duration-700 ${isRunning || showPauseMenu ? 'opacity-0 translate-y-8 pointer-events-none' : 'opacity-100 translate-y-0'}`}><div className="flex items-center gap-12"><div className="flex flex-col items-center gap-3 group"><span className="text-[9px] uppercase tracking-[0.2em] text-stone-600 group-hover:text-[#d4af37] transition-colors">Focus Time</span><div className="flex items-center gap-4"><button onClick={(e) => { e.stopPropagation(); setWorkDuration(Math.max(1, workDuration - 5)) }} className="w-8 h-8 rounded-full border border-stone-800 flex items-center justify-center text-stone-500 hover:border-[#d4af37] hover:text-[#d4af37] transition-all">-</button><span className="font-serif text-xl text-stone-300 w-8 text-center">{workDuration}</span><button onClick={(e) => { e.stopPropagation(); setWorkDuration(Math.min(60, workDuration + 5)) }} className="w-8 h-8 rounded-full border border-stone-800 flex items-center justify-center text-stone-500 hover:border-[#d4af37] hover:text-[#d4af37] transition-all">+</button></div></div><div className="w-[1px] h-10 bg-stone-800" /><div className="flex flex-col items-center gap-3 group"><span className="text-[9px] uppercase tracking-[0.2em] text-stone-600 group-hover:text-stone-400 transition-colors">Restore Time</span><div className="flex items-center gap-4"><button onClick={(e) => { e.stopPropagation(); setBreakDuration(Math.max(1, breakDuration - 1)) }} className="w-8 h-8 rounded-full border border-stone-800 flex items-center justify-center text-stone-500 hover:border-stone-400 hover:text-stone-300 transition-all">-</button><span className="font-serif text-xl text-stone-400 w-8 text-center">{breakDuration}</span><button onClick={(e) => { e.stopPropagation(); setBreakDuration(Math.min(30, breakDuration + 1)) }} className="w-8 h-8 rounded-full border border-stone-800 flex items-center justify-center text-stone-500 hover:border-stone-400 hover:text-stone-300 transition-all">+</button></div></div></div><div className="flex items-center justify-center gap-12 pt-4 border-t border-stone-800/30"><div className="flex flex-col items-center gap-3 group"><span className="text-[9px] uppercase tracking-[0.2em] text-stone-600 group-hover:text-stone-300 transition-colors">Cycles</span><div className="flex items-center gap-4"><button onClick={(e) => { e.stopPropagation(); setIterations(Math.max(1, iterations - 1)) }} className="w-8 h-8 rounded-full border border-stone-800 flex items-center justify-center text-stone-500 hover:border-stone-500 hover:text-stone-300 transition-all">-</button><span className="font-serif text-xl text-stone-300 w-8 text-center">{iterations}</span><button onClick={(e) => { e.stopPropagation(); setIterations(Math.min(10, iterations + 1)) }} className="w-8 h-8 rounded-full border border-stone-800 flex items-center justify-center text-stone-500 hover:border-stone-500 hover:text-stone-300 transition-all">+</button></div></div><div className="flex flex-col items-center gap-2"><span className="text-[9px] uppercase tracking-[0.2em] text-stone-600">Total Duration</span><span className="font-serif text-lg text-[#d4af37] tracking-wide">{totalTimeString}</span></div></div></div>
    </div>
  );
};

const BreathingView = ({ isActive, onImmersiveChange, onPhaseChange }: { isActive: boolean, onImmersiveChange: (immersive: boolean) => void, onPhaseChange: (phase: BreathingPhase) => void }) => {
  const [technique, setTechnique] = useState<'relax' | 'box' | 'equal'>('relax');
  const [phase, setPhase] = useState<BreathingPhase>('idle');
  const [isRunning, setIsRunning] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [timerText, setTimerText] = useState("");

  const techniques = {
    relax: { inhale: 4, hold: 7, exhale: 8, holdEmpty: 0, label: "Relax (4-7-8)", description: "For deep sleep & anxiety" },
    box: { inhale: 4, hold: 4, exhale: 4, holdEmpty: 4, label: "Focus (Box)", description: "For balance & concentration" },
    equal: { inhale: 4, hold: 0, exhale: 4, holdEmpty: 0, label: "Calm (4-4)", description: "Simple rhythmic grounding" }
  };

  useEffect(() => { onImmersiveChange(isRunning || countdown !== null); }, [isRunning, countdown, onImmersiveChange]);

  useEffect(() => {
    if (!isRunning) {
        setPhase('idle');
        onPhaseChange('idle');
        return;
    }
    let timer: number;
    const startCycle = () => {
      const { inhale, hold, exhale, holdEmpty } = techniques[technique];
      const runPhase = (p: BreathingPhase, duration: number, next: () => void) => {
        if (!isRunning) return;
        setPhase(p);
        onPhaseChange(p);
        let count = duration;
        setTimerText(count.toString());
        timer = window.setInterval(() => {
          count--;
          if (count <= 0) { clearInterval(timer); next(); }
          else setTimerText(count.toString());
        }, 1000);
      };

      runPhase('inhale', inhale, () => {
        if (hold > 0) runPhase('hold', hold, () => runPhase('exhale', exhale, () => holdEmpty > 0 ? runPhase('hold-empty', holdEmpty, startCycle) : startCycle()));
        else runPhase('exhale', exhale, startCycle);
      });
    };
    startCycle();
    return () => clearInterval(timer);
  }, [isRunning, technique]);

  const toggle = () => {
    if (isRunning) {
      setIsRunning(false);
      setCountdown(null);
    } else {
      if (countdown !== null) return;
      setCountdown(3);
      setPhase('countdown');
      onPhaseChange('countdown');
      const int = window.setInterval(() => {
        setCountdown(prev => {
          if (prev === 1) {
            clearInterval(int);
            setIsRunning(true);
            return null;
          }
          return (prev || 0) - 1;
        });
      }, 1000);
    }
  };

  const getPhaseText = () => {
    if (countdown !== null) return "Prepare to Expand";
    switch (phase) {
      case 'inhale': return "Inhale through nose";
      case 'hold': return "Find the gap";
      case 'exhale': return "Surrender the air";
      case 'hold-empty': return "Stillness";
      default: return "";
    }
  };

  return (
    <div className="flex flex-col items-center h-full w-full relative">
      {/* Technique Selectors */}
      <div className={`mt-4 flex items-center justify-center gap-4 transition-all duration-1000 z-50 ${isRunning || countdown !== null ? 'opacity-0 pointer-events-none -translate-y-8' : 'opacity-100'}`} onClick={(e) => e.stopPropagation()}>
         {Object.keys(techniques).map((k) => (
           <button 
             key={k} 
             onClick={(e) => { e.stopPropagation(); setTechnique(k as any); }} 
             className={`px-4 py-2 rounded-full border text-[10px] uppercase tracking-widest transition-all ${technique === k ? 'border-[#d4af37] text-[#d4af37] bg-[#d4af37]/10' : 'border-stone-800 text-stone-600 hover:text-stone-400'}`}
           >
              {techniques[k as keyof typeof techniques].label.split(' ')[0]}
           </button>
         ))}
         <button onClick={(e) => { e.stopPropagation(); setShowInfo(true); }} className="w-8 h-8 rounded-full border border-stone-800 text-stone-600 flex items-center justify-center hover:text-[#d4af37] transition-colors"><span className="text-[10px] italic font-bold">i</span></button>
      </div>

      {/* Main Breathing Area */}
      <div className="relative flex items-center justify-center w-full flex-grow overflow-hidden" onClick={toggle}>
        <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center transition-all duration-700">
            <div className={`absolute inset-0 rounded-full blur-[60px] transition-all duration-[4000ms] ease-in-out
               ${phase === 'inhale' ? 'scale-125 opacity-30 bg-[#d4af37]' : 
                 phase === 'hold' ? 'scale-125 opacity-40 bg-amber-600' : 
                 phase === 'exhale' ? 'scale-75 opacity-10 bg-stone-500' : 
                 phase === 'hold-empty' ? 'scale-75 opacity-20 bg-stone-900' : 
                 countdown !== null ? 'scale-105 opacity-20 bg-[#d4af37] animate-pulse' : 'scale-90 opacity-5 bg-stone-700'}`} 
            />
            {[1, 2, 3].map((i) => (
                <div key={i} className={`absolute border rounded-full transition-all duration-[4000ms] ease-in-out
                    ${phase === 'inhale' ? `scale-110 opacity-30 border-[#d4af37]` : 
                      phase === 'exhale' ? `scale-90 opacity-10 border-stone-600` :
                      `scale-100 opacity-20 border-stone-800`}`}
                    style={{ width: `${100 + i * 40}px`, height: `${100 + i * 40}px`, transitionDelay: `${i * 100}ms` }} 
                />
            ))}
            
            <div className={`w-28 h-28 md:w-36 md:h-36 rounded-full flex flex-col items-center justify-center relative z-10 transition-all duration-[4000ms] ease-in-out shadow-2xl bg-stone-950 border
              ${phase === 'inhale' ? 'scale-150 border-[#d4af37]' : 
                phase === 'hold' ? 'scale-150 border-amber-600' : 
                phase === 'exhale' ? 'scale-90 border-stone-800' : 
                countdown !== null ? 'scale-110 border-[#d4af37]/60' : 'scale-100 border-stone-900 group-hover:border-stone-700'}`}
            >
              {countdown !== null && (
                 <div className="flex flex-col items-center animate-in zoom-in-50 duration-300">
                    <span className="text-[#d4af37] font-serif text-5xl md:text-6xl leading-none">{countdown}</span>
                 </div>
              )}
              {isRunning && countdown === null && (
                  <div className="flex flex-col items-center animate-in fade-in duration-1000">
                      <span className="text-[#d4af37] font-serif text-3xl md:text-4xl mb-1 leading-none">{timerText}</span>
                      <span className="text-[7px] uppercase tracking-widest text-stone-600 font-bold">{phase}</span>
                  </div>
              )}
              {!isRunning && countdown === null && <BreathIcon className="w-10 h-10 md:w-12 md:h-12 text-[#d4af37] opacity-40" />}
            </div>
        </div>
      </div>

      {/* Instructions Overlay */}
      <div className={`pb-12 text-center transition-all duration-1000 ${isRunning || countdown !== null ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-2'}`}>
        <h3 className="text-[#d4af37] font-serif text-lg md:text-2xl tracking-[0.15em] mb-3">
          {isRunning || countdown !== null ? getPhaseText() : "Tap to Begin Expansion"}
        </h3>
        <p className="text-stone-600 text-[9px] uppercase tracking-[0.3em]">
           {isRunning ? techniques[technique].label : techniques[technique].description}
        </p>
      </div>

      {showInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-in fade-in duration-300" onClick={(e) => { e.stopPropagation(); setShowInfo(false); }}>
            <div className="bg-[#12100e] border border-stone-800 p-8 max-w-sm w-full relative shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowInfo(false)} className="absolute top-4 right-4 text-stone-600 hover:text-[#d4af37] transition-colors"><XIcon className="w-5 h-5" /></button>
                <h3 className="text-[#d4af37] font-serif text-lg tracking-widest uppercase mb-6 text-center border-b border-stone-900 pb-4">Breathing Arts</h3>
                <div className="space-y-6">
                    {Object.keys(techniques).map(k => (
                        <div key={k}>
                            <h4 className="text-stone-300 font-serif mb-1 tracking-wide">{techniques[k as keyof typeof techniques].label}</h4>
                            <p className="text-stone-500 text-[11px] leading-relaxed font-light">{techniques[k as keyof typeof techniques].description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

const BurnerJournalView = ({ isAudioEnabled }: { isAudioEnabled: boolean }) => {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<'idle' | 'burning' | 'essay' | 'reflection'>('idle');
  const [currentEssay, setCurrentEssay] = useState<typeof JOURNAL_ESSAYS[0] | null>(null);
  const handleBurn = () => { if (!text.trim()) return; setCurrentEssay(JOURNAL_ESSAYS[Math.floor(Math.random() * JOURNAL_ESSAYS.length)]); setMode('essay'); };
  const handleReady = () => { setText(""); setMode('reflection'); };
  const handleEdit = () => setMode('idle');

  return (
    <div className="w-full h-full flex flex-col items-center justify-start pt-12 md:pt-20 p-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
       <div className={`text-center mb-8 transition-all duration-700 ${mode === 'reflection' ? 'opacity-0 h-0 overflow-hidden mb-0' : 'opacity-100'}`}><h2 className="text-[#d4af37] font-serif text-xl tracking-[0.2em] uppercase opacity-80 mb-2">The Burner</h2><div className="w-12 h-[1px] bg-stone-800 mx-auto" /><p className="text-stone-600 text-xs mt-4 tracking-widest uppercase">{mode === 'essay' ? "Insight" : "Release your burdens into the void"}</p></div>
      <div className="relative w-full max-w-lg min-h-[400px]">
        <div className={`transition-all duration-700 ease-in-out w-full ${(mode === 'idle' || mode === 'burning') ? 'opacity-100 relative z-10' : 'opacity-0 absolute inset-0 z-0 pointer-events-none translate-y-8'}`}><textarea value={text} onChange={(e) => setText(e.target.value)} disabled={mode === 'burning'} placeholder="Type out what weighs on you..." className="w-full h-64 bg-stone-900/30 border border-stone-800/50 rounded-sm p-6 text-stone-400 font-serif text-lg italic focus:outline-none focus:border-[#d4af37]/30 transition-all resize-none placeholder-stone-700" /><div className="mt-8 flex justify-center"><button onClick={handleBurn} disabled={!text.trim() || mode === 'burning'} className="px-8 py-3 border border-stone-800 text-stone-500 hover:text-[#d4af37] hover:border-[#d4af37]/50 rounded-full text-xs uppercase tracking-[0.3em] transition-all disabled:opacity-30 disabled:cursor-not-allowed group relative overflow-hidden"><span className="relative z-10">Release</span><div className="absolute inset-0 bg-[#d4af37]/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"/></button></div></div>
        <div className={`transition-all duration-1000 ease-in-out flex flex-col items-center justify-center ${mode === 'essay' ? 'opacity-100 relative translate-y-0' : 'opacity-0 absolute inset-0 pointer-events-none -translate-y-4'}`}>{currentEssay && (<><h3 className="text-stone-400 font-serif text-lg italic mb-6 tracking-wide">"{currentEssay.title}"</h3><p className="text-stone-300 font-serif text-base md:text-xl leading-loose text-center font-light">{currentEssay.text}</p></>)}<div className="flex gap-4 mt-12"><button onClick={handleEdit} className="px-6 py-3 border border-stone-800 text-stone-600 hover:text-stone-400 text-[10px] uppercase tracking-widest rounded-full transition-colors">Edit Text</button><button onClick={handleReady} className="px-8 py-3 bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/20 text-[10px] uppercase tracking-widest rounded-full transition-all shadow-[0_0_15px_rgba(212,175,55,0.1)] hover:shadow-[0_0_25px_rgba(212,175,55,0.2)]">I am ready</button></div></div>
        <div className={`transition-all duration-1000 ease-in-out flex flex-col items-center justify-center ${mode === 'reflection' ? 'opacity-100 relative translate-y-0' : 'opacity-0 absolute inset-0 pointer-events-none translate-y-4'}`}><div className="w-16 h-16 rounded-full bg-[#d4af37]/5 flex items-center justify-center mb-8 animate-pulse"><div className="w-2 h-2 bg-[#d4af37] rounded-full shadow-[0_0_10px_#d4af37]" /></div><p className="text-stone-400 font-serif text-xl md:text-2xl text-center leading-relaxed max-w-md">It is time to self reflect.<br /><span className="text-[#d4af37] text-lg opacity-80 mt-4 block">Put the phone away for a few minutes.</span></p><button onClick={handleEdit} className="mt-16 text-stone-700 hover:text-stone-500 text-[10px] uppercase tracking-[0.2em] transition-colors">Begin Again</button></div>
      </div>
    </div>
  );
};

type Message = { id: string; role: 'user' | 'model'; text: string; image?: string; isPlaying?: boolean; isNew?: boolean; };
type LoadingPhase = 'init' | 'logo-waiting' | 'logo-bloom' | 'shift-and-quote' | 'reveal-instruction' | 'entering' | 'done';
type ViewMode = 'chat' | 'breathe' | 'journal' | 'focus';

const App = () => {
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>('init');
  const [isOverlayFading, setIsOverlayFading] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState<{ text: string, source: string } | null>(null);
  const [isMonkEntering, setIsMonkEntering] = useState(false);
  const [isSettled, setIsSettled] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false); 
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isImmersive, setIsImmersive] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  
  const chatRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const ambientContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const templeGainRef = useRef<GainNode | null>(null);
  const breathDroneGainRef = useRef<GainNode | null>(null);
  const breathFilterRef = useRef<BiquadFilterNode | null>(null);
  const focusGainRef = useRef<GainNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isActive = isSpeaking || isTyping;

  const initAudio = useCallback(() => {
    if (ambientContextRef.current) return;
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx(); ambientContextRef.current = ctx;
    const master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination); masterGainRef.current = master;
    
    // --- Temple Ambience (Chat Mode) ---
    const templeGain = ctx.createGain(); 
    templeGain.gain.value = 0; 
    templeGain.connect(master); 
    templeGainRef.current = templeGain;

    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; 
    }

    const waterSource = ctx.createBufferSource();
    waterSource.buffer = noiseBuffer;
    waterSource.loop = true;
    const waterFilter = ctx.createBiquadFilter();
    waterFilter.type = 'lowpass';
    waterFilter.frequency.value = 120; 
    const waterGain = ctx.createGain();
    waterGain.gain.value = 0.08; 
    waterSource.connect(waterFilter).connect(waterGain).connect(templeGain);
    waterSource.start();

    const scale = [155.56, 174.61, 196.00, 233.08, 261.63]; 
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.75; 
    const delayFeedback = ctx.createGain();
    delayFeedback.gain.value = 0.4;
    const delayFilter = ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 800; 
    templeGain.connect(delay);
    delay.connect(delayFilter);
    delayFilter.connect(delayFeedback);
    delayFeedback.connect(delay);
    delay.connect(master);

    const playGlassNote = () => {
        if (ctx.state === 'suspended') return;
        const now = ctx.currentTime;
        const noteFreq = scale[Math.floor(Math.random() * scale.length)];
        const carrier = ctx.createOscillator();
        carrier.type = 'sine';
        carrier.frequency.value = noteFreq;
        const modulator = ctx.createOscillator();
        modulator.type = 'sine';
        modulator.frequency.value = noteFreq * 2;
        const modGain = ctx.createGain();
        modulator.connect(modGain);
        modGain.connect(carrier.frequency);
        const masterVol = ctx.createGain();
        masterVol.gain.setValueAtTime(0, now);
        masterVol.gain.linearRampToValueAtTime(0.06, now + 0.1); 
        masterVol.gain.exponentialRampToValueAtTime(0.001, now + 5.0); 
        modGain.gain.setValueAtTime(100, now); 
        modGain.gain.exponentialRampToValueAtTime(1, now + 1.0); 
        const panner = ctx.createStereoPanner();
        panner.pan.value = (Math.random() * 1.6) - 0.8;
        carrier.connect(masterVol).connect(panner).connect(templeGain);
        carrier.start(now);
        modulator.start(now);
        carrier.stop(now + 6);
        modulator.stop(now + 6);
        setTimeout(playGlassNote, 3000 + Math.random() * 4000);
    };
    playGlassNote();

    const breathGain = ctx.createGain();
    breathGain.gain.value = 0;
    breathGain.connect(master);
    breathDroneGainRef.current = breathGain;
    const masterFilter = ctx.createBiquadFilter();
    masterFilter.type = 'lowpass';
    masterFilter.frequency.value = 400; 
    breathFilterRef.current = masterFilter;
    const floatingFreqs = [110.00, 164.81, 220.00, 277.18, 329.63, 440.00, 659.25];
    floatingFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const vca = ctx.createGain();
      const panner = ctx.createStereoPanner();
      osc.type = 'triangle';
      osc.frequency.value = freq + (Math.random() * 0.4);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.04 + (i * 0.012); 
      const lfoG = ctx.createGain();
      lfoG.gain.value = 0.03;
      lfo.connect(lfoG).connect(vca.gain);
      lfo.start();
      panner.pan.value = (i % 2 === 0 ? -0.8 : 0.8);
      osc.connect(panner).connect(vca).connect(masterFilter).connect(breathGain);
      vca.gain.value = 0.04; 
      osc.start();
    });

    const focusGain = ctx.createGain(); focusGain.gain.value = 0; focusGain.connect(master); focusGainRef.current = focusGain;
    [130.81, 155.56, 196.00, 293.66].forEach((f) => {
        const osc = ctx.createOscillator(); const g = ctx.createGain(); const p = ctx.createStereoPanner(); osc.type = 'triangle'; osc.frequency.value = f;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.04; const lg = ctx.createGain(); lg.gain.value = 0.025; g.gain.value = 0.015; lfo.connect(lg).connect(g.gain); lfo.start();
        const panLfo = ctx.createOscillator(); panLfo.frequency.value = 0.02; panLfo.connect(p.pan); panLfo.start();
        const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 400; osc.connect(filter).connect(g).connect(p).connect(focusGain); osc.start();
    });
    if (ctx.state === 'suspended') ctx.resume();
  }, []);

  const updateAudioMix = useCallback((mode: ViewMode, phase?: BreathingPhase) => {
      if (!ambientContextRef.current || !templeGainRef.current || !breathDroneGainRef.current) return;
      const ctx = ambientContextRef.current; 
      const now = ctx.currentTime; 
      if (!isMusicEnabled) {
        masterGainRef.current?.gain.setTargetAtTime(0, now, 0.5); 
      } else {
        masterGainRef.current?.gain.setTargetAtTime(0.8, now, 1);
      }
      if (mode === 'chat') { 
        templeGainRef.current.gain.setTargetAtTime(1, now, 3); 
        focusGainRef.current?.gain.setTargetAtTime(0, now, 3);
        breathDroneGainRef.current?.gain.setTargetAtTime(0, now, 2);
      }
      else if (mode === 'breathe') {
        templeGainRef.current.gain.setTargetAtTime(0, now, 3);
        focusGainRef.current?.gain.setTargetAtTime(0, now, 3);
        breathDroneGainRef.current?.gain.setTargetAtTime(1, now, 3);
        if (breathFilterRef.current) {
          if (phase === 'inhale') {
             breathFilterRef.current.frequency.setTargetAtTime(1200, now, 3);
             breathDroneGainRef.current?.gain.setTargetAtTime(1.4, now, 3);
          } else if (phase === 'exhale') {
             breathFilterRef.current.frequency.setTargetAtTime(250, now, 4);
             breathDroneGainRef.current?.gain.setTargetAtTime(0.4, now, 4);
          } else {
             breathFilterRef.current.frequency.setTargetAtTime(500, now, 2);
          }
        }
      }
      else if (mode === 'focus') { 
        templeGainRef.current.gain.setTargetAtTime(0, now, 3); 
        breathDroneGainRef.current?.gain.setTargetAtTime(0, now, 2);
        focusGainRef.current?.gain.setTargetAtTime(1, now, 3); 
      }
      else if (mode === 'journal') { 
        templeGainRef.current.gain.setTargetAtTime(0.2, now, 3); 
        breathDroneGainRef.current?.gain.setTargetAtTime(0, now, 2);
        focusGainRef.current?.gain.setTargetAtTime(0, now, 3); 
      }
  }, [isMusicEnabled]);

  const strikeZenBell = useCallback((multiplier = 1.0) => {
    if (!isMusicEnabled) return; initAudio(); if (!ambientContextRef.current) return;
    const ctx = ambientContextRef.current; if (ctx.state === 'suspended') ctx.resume(); const now = ctx.currentTime;
    [1, 1.1, 1.5, 2, 2.7, 3].forEach((ratio, i) => { const osc = ctx.createOscillator(); const g = ctx.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(55 * ratio, now); g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime((i === 0 ? 0.6 : 0.3 / (i + 1)) * multiplier, now + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, now + 10); osc.connect(g).connect(ctx.destination); osc.start(now); osc.stop(now + 10.1); });
  }, [initAudio, isMusicEnabled]);

  const playStartChime = useCallback(() => {
    initAudio(); if (!ambientContextRef.current) return;
    const ctx = ambientContextRef.current; const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(440, ctx.currentTime); gain.gain.setValueAtTime(0, ctx.currentTime); gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6); osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.7);
  }, [initAudio]);

  const startIntroSequence = () => {
    if (loadingPhase !== 'init') return;

    // 1. Initialize main audio engine
    initAudio();

    // 2. Play the intro music directly from path
    const introAudio = new Audio("./intro.mp3"); 
    introAudio.volume = 1.0; 
    introAudio.play().catch(e => console.error("Audio play failed", e));

    // 3. Sync visuals
    setLoadingPhase('logo-waiting');

    setTimeout(() => {
      setLoadingPhase('logo-bloom'); 
      
      setTimeout(() => {
        setLoadingPhase('shift-and-quote'); 
        
        setTimeout(() => {
            // Fade out logic
            const fadeOut = setInterval(() => {
                if (introAudio.volume > 0.05) introAudio.volume -= 0.05;
                else { introAudio.pause(); clearInterval(fadeOut); }
            }, 100);
            
            setLoadingPhase('reveal-instruction');
        }, 5000); 
      }, 2000);
    }, 1200);
  };

  const enterSanctuary = useCallback(() => { if (loadingPhase !== 'reveal-instruction') return; setLoadingPhase('entering'); strikeZenBell(1.0); initAudio(); if (ambientContextRef.current && masterGainRef.current) { updateAudioMix('chat'); } const sequence = async () => { await new Promise(r => setTimeout(r, 1500)); setIsOverlayFading(true); await new Promise(r => setTimeout(r, 800)); setIsMonkEntering(true); await new Promise(r => setTimeout(r, 1000)); setLoadingPhase('done'); await new Promise(r => setTimeout(r, 1400)); setIsMonkEntering(false); setIsSettled(true); setMessages([{ id: 'init', role: 'model', text: "I am here. The noise of the world cannot reach us in this place. What is on your mind?", isNew: true }]); }; sequence(); }, [loadingPhase, initAudio, strikeZenBell, updateAudioMix]);

  useEffect(() => {
    setLoadingQuote(LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)]);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    chatRef.current = ai.chats.create({ model: 'gemini-3-flash-preview', config: { systemInstruction: `You are an enlightened Buddhist monk. Speak concisely and profoundly.`, } });
  }, []);

  useEffect(() => { updateAudioMix(viewMode); }, [isMusicEnabled, updateAudioMix, viewMode]);

  const handleSend = async () => {
    if ((!input.trim() && !attachedImage) || isThinking || !isSettled) return; strikeZenBell(1.1);
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input, image: attachedImage || undefined }; setMessages(prev => [...prev.map(m => ({ ...m, isNew: false })), userMsg]);
    const ci = input; const cimg = attachedImage; setInput(""); setAttachedImage(null); setIsThinking(true); setIsTyping(true);
    try {
      let r; 
      if (cimg) { 
        const b64 = cimg.split(',')[1]; 
        r = await chatRef.current.sendMessageStream({ 
          message: [
            { inlineData: { data: b64, mimeType: 'image/png' } }, 
            { text: ci || "Reflect." }
          ] 
        }); 
      } else {
        r = await chatRef.current.sendMessageStream({ message: ci });
      }
      const mid = (Date.now() + 1).toString(); let ft = ""; setMessages(prev => [...prev, { id: mid, role: 'model', text: "", isNew: true }]); setIsSpeaking(true);
      for await (const chunk of r) { ft += chunk.text; setMessages(prev => prev.map(msg => msg.id === mid ? { ...msg, text: ft } : msg)); }
      setIsSpeaking(false);
    } catch (e) { setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Breathe and speak again.", isNew: true }]); setIsSpeaking(false); } finally { setIsThinking(false); }
  };

  const handleModeSwitch = (mode: ViewMode) => { if (viewMode === mode) return; setIsTransitioning(true); updateAudioMix(mode); setTimeout(() => { setViewMode(mode); setIsTransitioning(false); }, 500); };

  useEffect(() => { if (scrollRef.current && viewMode === 'chat') scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, isThinking, viewMode]);

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col bg-[#12100e] text-stone-300 overflow-hidden site-entrance" onClick={() => loadingPhase === 'init' ? startIntroSequence() : loadingPhase === 'reveal-instruction' && enterSanctuary()}>
      {isSettled && <HeaderControls isMusic={isMusicEnabled} toggleMusic={() => setIsMusicEnabled(prev => !prev)} isVoice={isAudioEnabled} toggleVoice={() => setIsAudioEnabled(prev => !prev)} onAboutClick={() => setShowAbout(true)} hidden={isImmersive} />}
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
      {loadingPhase !== 'done' && (
        <div className={`fixed inset-0 z-[100] bg-[#12100e] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-[2000ms] ${isOverlayFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className={`flex flex-col items-center justify-center px-8 transition-opacity duration-[1000ms] ${loadingPhase === 'init' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
             <div className="headphones-visual mb-12 flex items-center justify-center"><div className="ripple ripple-1" /><div className="relative z-10 w-20 h-20 text-[#d4af37] opacity-60"><HeadphoneIcon className="w-full h-full" /></div></div>
             <p className="text-stone-400 text-[10px] uppercase tracking-[0.2em] mb-16 opacity-80 text-center">Please wear headphones</p>
             <button className="px-12 py-4 border border-stone-800 text-stone-300 text-[10px] uppercase tracking-[0.4em] rounded-full">Begin</button>
          </div>
          <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-1000 ${['logo-bloom', 'shift-and-quote', 'reveal-instruction', 'entering'].includes(loadingPhase) ? 'opacity-100' : 'opacity-0'}`}>
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[200px] flex flex-col items-center transition-all duration-1000 ${loadingPhase === 'entering' ? 'opacity-0' : 'opacity-100'}`}><LotusIcon size={90} isErasing={loadingPhase === 'entering'} /><h1 className="text-[#d4af37] font-serif text-lg tracking-[0.5em] uppercase mt-8">The Silent Temple</h1></div>
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[-20px] w-full max-w-xl px-12 text-center transition-all duration-[2000ms] ${['shift-and-quote', 'reveal-instruction', 'entering'].includes(loadingPhase) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${loadingPhase === 'entering' ? 'opacity-0' : ''}`}><p className="text-stone-500 font-serif text-lg md:text-xl italic leading-relaxed">"{loadingQuote?.text}"</p><span className="text-stone-700 font-serif text-sm block mt-4">— {loadingQuote?.source}</span></div>
            <div className={`absolute bottom-24 transition-all duration-[1000ms] ${loadingPhase === 'reveal-instruction' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}><span className="text-[10px] uppercase tracking-[0.6em] text-[#d4af37] animate-pulse">Tap to step inside</span></div>
          </div>
        </div>
      )}
      <header className={`flex-shrink-0 relative flex flex-col items-center justify-end transition-all duration-1000 border-b border-stone-900/40 pt-[env(safe-area-inset-top)] ${isImmersive ? 'h-0 opacity-0' : (viewMode === 'chat' ? 'h-[35vh]' : 'h-[25vh]')}`}>
        {(isMonkEntering || isSettled) && (
          <div className="relative flex flex-col items-center">
            {viewMode === 'chat' ? ( <div className={`transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}><MonkAvatar isActive={isActive} isEntering={isMonkEntering} /></div> ) : ( <div className={`mb-4 text-[#d4af37] opacity-60 w-16 h-16 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}><MorphingHeaderIcon mode={viewMode} /></div> )}
            <div className="flex items-center gap-6 mt-4">
               <button onClick={(e) => { e.stopPropagation(); handleModeSwitch('journal'); }} className={`p-2 ${viewMode === 'journal' ? 'text-[#d4af37]' : 'text-stone-700'}`}><FireIcon className="w-5 h-5" /></button>
               <button onClick={(e) => { e.stopPropagation(); handleModeSwitch('chat'); }} className={`p-2 ${viewMode === 'chat' ? 'text-[#d4af37]' : 'text-stone-700'}`}><ChatIcon className="w-5 h-5" /></button>
               <button onClick={(e) => { e.stopPropagation(); handleModeSwitch('breathe'); }} className={`p-2 ${viewMode === 'breathe' ? 'text-[#d4af37]' : 'text-stone-700'}`}><BreathIcon className="w-5 h-5" /></button>
               <button onClick={(e) => { e.stopPropagation(); handleModeSwitch('focus'); }} className={`p-2 ${viewMode === 'focus' ? 'text-[#d4af37]' : 'text-stone-700'}`}><HourglassIcon className="w-5 h-5" /></button>
            </div>
          </div>
        )}
      </header>
      <main ref={scrollRef} className="flex-1 overflow-y-auto px-6 md:px-12 py-12 w-full max-w-3xl mx-auto scroll-smooth relative overscroll-y-contain">
        <div className={`transition-all duration-500 h-full ${isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
            {viewMode === 'chat' && ( <div className="space-y-12">{messages.map((msg) => ( <div key={msg.id} className={`flex w-full message-fade-in ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>{msg.role === 'model' ? ( <div className="flex flex-col gap-4 max-w-full text-stone-500 font-serif text-lg font-light">{msg.isNew ? <TypewriterText text={msg.text} isStreaming={isThinking} onDone={() => setIsTyping(false)} /> : <FormattedText text={msg.text} />}</div> ) : ( <div className="flex flex-col items-end gap-2 max-w-[85%]">{msg.image && <img src={msg.image} className="w-32 h-32 object-cover rounded mb-2 border border-stone-800" />}<div className="bg-stone-900/5 px-6 py-4 italic font-serif tracking-widest leading-relaxed text-stone-600">"{msg.text}"</div></div> )}</div> ))}{isThinking && <div className="opacity-30 italic text-[9px] uppercase animate-pulse">Reflecting...</div>}<div className="h-20" /></div> )}
            {viewMode === 'breathe' && (
              <BreathingView 
                isActive={true} 
                onImmersiveChange={setIsImmersive} 
                onPhaseChange={(p) => updateAudioMix('breathe', p)} 
              />
            )}
            {viewMode === 'journal' && <BurnerJournalView isAudioEnabled={isAudioEnabled} />}
            {viewMode === 'focus' && <PomodoroView isActive={viewMode === 'focus' && !isTransitioning} onTimerComplete={() => strikeZenBell(1.2)} onRestoreComplete={playStartChime} onStart={playStartChime} />}
        </div>
      </main>
      {viewMode === 'chat' && ( <footer className="px-4 pb-[env(safe-area-inset-bottom)] md:p-12 relative z-30" onClick={(e) => e.stopPropagation()}><div className="max-w-xl mx-auto flex items-center gap-3"><input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setAttachedImage(r.result as string); r.readAsDataURL(f); } }} accept="image/*" className="hidden" /><div className="relative flex-grow"><input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Exhale your words..." className="w-full bg-stone-900/70 text-stone-300 pl-12 pr-20 py-5 rounded-full outline-none border border-stone-800/40 backdrop-blur-3xl" disabled={isThinking || !isSettled} /><button onClick={() => fileInputRef.current?.click()} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-600"><CameraIcon className="w-5 h-5" /></button><div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">{input.length === 0 && !attachedImage ? <button className="w-10 h-10 text-stone-600"><MicIcon className="w-5 h-5" /></button> : <button onClick={handleSend} disabled={isThinking} className="w-10 h-10 text-stone-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button>}</div></div></div></footer> )}
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
