export type EmotionType = 'happy' | 'neutral' | 'sad';

export interface VoiceNote {
  id: string;
  title: string;
  audioBlob: Blob;
  audioUrl: string;
  emotion: EmotionType;
  duration: number;
  createdAt: Date;
  transcript?: string;
}

export interface EmotionData {
  date: string;
  happy: number;
  neutral: number;
  sad: number;
}