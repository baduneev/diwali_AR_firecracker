import type {Kind,Timing} from './core';
import manifest from '../assets/audio-manifest.json';
export const KINDS:Kind[]=['anar','sutli','chakri','sky','ladi','phuljhadi'];
export const NAMES:Record<Kind,string>={anar:'Anar',sutli:'Sutli bomb',chakri:'Chakri',sky:'Sky shot',ladi:'Ladi',phuljhadi:'Phuljhadi'};
export const AUDIO:Record<Kind,number>={anar:require('../assets/audio/anar.wav'),sutli:require('../assets/audio/sutli.wav'),chakri:require('../assets/audio/chakri.wav'),sky:require('../assets/audio/sky.wav'),ladi:require('../assets/audio/ladi.wav'),phuljhadi:require('../assets/audio/phuljhadi.wav')};
export function timing(k:Kind):Timing {const m=manifest[k];return {duration:m.duration,main:m.main_start,peak:m.peak,cues:k==='ladi'?manifest.ladi.burst_times:[]};}
