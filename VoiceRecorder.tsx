import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Square } from 'lucide-react';
import { EmotionType, VoiceNote } from '@/types/voice-note';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface VoiceRecorderProps {
  onNoteCreated: (note: VoiceNote) => void;
}

export const VoiceRecorder = ({ onNoteCreated }: VoiceRecorderProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [detectedEmotion, setDetectedEmotion] = useState<EmotionType | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>(Array(20).fill(0.3));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const waveformRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const emotionSamplesRef = useRef<{ pitch: number; volume: number; variance: number }[]>([]);

  // Analyze audio features for emotion detection
  const analyzeAudioEmotion = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const timeDomainArray = new Float32Array(bufferLength);
    
    analyser.getByteFrequencyData(dataArray);
    analyser.getFloatTimeDomainData(timeDomainArray);

    // Calculate volume (RMS)
    let sum = 0;
    for (let i = 0; i < timeDomainArray.length; i++) {
      sum += timeDomainArray[i] * timeDomainArray[i];
    }
    const volume = Math.sqrt(sum / timeDomainArray.length);

    // Calculate pitch (dominant frequency)
    let maxValue = 0;
    let maxIndex = 0;
    for (let i = 0; i < bufferLength; i++) {
      if (dataArray[i] > maxValue) {
        maxValue = dataArray[i];
        maxIndex = i;
      }
    }
    const pitch = maxIndex * (audioContextRef.current?.sampleRate || 44100) / (bufferLength * 2);

    // Calculate variance (energy distribution)
    const mean = dataArray.reduce((a, b) => a + b) / bufferLength;
    const variance = dataArray.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / bufferLength;

    // Store sample
    emotionSamplesRef.current.push({ pitch, volume, variance });

    // Analyze after collecting enough samples
    if (emotionSamplesRef.current.length >= 10) {
      const samples = emotionSamplesRef.current;
      
      // Calculate averages
      const avgPitch = samples.reduce((sum, s) => sum + s.pitch, 0) / samples.length;
      const avgVolume = samples.reduce((sum, s) => sum + s.volume, 0) / samples.length;
      const avgVariance = samples.reduce((sum, s) => sum + s.variance, 0) / samples.length;

      // Emotion classification based on audio features
      // Happy: Higher pitch, moderate-high volume, high variance (energetic, varied tone)
      // Sad: Lower pitch, lower volume, low variance (monotone, quiet)
      // Neutral: Medium values across all metrics
      
      let emotion: EmotionType = 'neutral';
      
      // Calculate normalized scores (0-1 range) for each feature
      const pitchScore = Math.min(Math.max((avgPitch - 150) / 200, 0), 1);
      const volumeScore = Math.min(Math.max(avgVolume / 0.15, 0), 1);
      const varianceScore = Math.min(Math.max(avgVariance / 800, 0), 1);
      
      // Calculate weighted scores for each emotion with more sensitive thresholds
      const happyScore = (
        (pitchScore > 0.5 ? 1 : pitchScore * 2) * 0.35 +
        (volumeScore > 0.6 ? 1 : volumeScore) * 0.35 +
        (varianceScore > 0.4 ? 1 : varianceScore * 1.5) * 0.3
      );
      
      const sadScore = (
        (pitchScore < 0.4 ? 1 : (1 - pitchScore) * 1.5) * 0.35 +
        (volumeScore < 0.5 ? 1 : (1 - volumeScore) * 1.2) * 0.4 +
        (varianceScore < 0.35 ? 1 : (1 - varianceScore) * 1.3) * 0.25
      );
      
      // Assign emotion based on strongest score with lower thresholds
      if (happyScore > 0.45 && happyScore > sadScore + 0.1) {
        emotion = 'happy';
      } else if (sadScore > 0.45 && sadScore > happyScore + 0.1) {
        emotion = 'sad';
      } else if (Math.abs(happyScore - sadScore) < 0.1 && (happyScore > 0.3 || sadScore > 0.3)) {
        // Mixed signals lean towards the slightly higher score
        emotion = happyScore > sadScore ? 'happy' : 'sad';
      } else {
        // Default to neutral only when both scores are low
        emotion = 'neutral';
      }

      setDetectedEmotion(emotion);
      if (emotionSamplesRef.current.length > 100) {
        emotionSamplesRef.current = emotionSamplesRef.current.slice(-100);
      }
    }
  }, []);

  // Simulate real-time waveform data
  const updateWaveform = useCallback(() => {
    setWaveformData(prev => 
      prev.map(() => Math.random() * 0.7 + 0.3)
    );
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      // Set up audio analysis
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      source.connect(analyserRef.current);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      emotionSamplesRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const finalEmotion: EmotionType = detectedEmotion ?? 'neutral';

        if (!user) {
          toast({
            title: "Error",
            description: "You must be logged in to save notes",
            variant: "destructive",
          });
          return;
        }

        try {
          // Upload audio to Supabase Storage
          const fileName = `${user.id}/${Date.now()}.wav`;
          const { error: uploadError } = await supabase.storage
            .from('voice-notes')
            .upload(fileName, audioBlob);

          if (uploadError) throw uploadError;

          // Get signed URL for audio
          const { data: urlData } = await supabase.storage
            .from('voice-notes')
            .createSignedUrl(fileName, 3600);

          // Save note metadata to database
          const { data: noteData, error: dbError } = await supabase
            .from('voice_notes')
            .insert({
              user_id: user.id,
              title: `Voice Note ${new Date().toLocaleDateString()}`,
              audio_path: fileName,
              emotion: finalEmotion,
              duration: recordingTime,
            })
            .select()
            .single();

          if (dbError) throw dbError;

          const newNote: VoiceNote = {
            id: noteData.id,
            title: noteData.title,
            audioBlob,
            audioUrl: urlData?.signedUrl || '',
            emotion: finalEmotion,
            duration: recordingTime,
            createdAt: new Date(noteData.created_at),
          };

          onNoteCreated(newNote);
        } catch (error: any) {
          toast({
            title: "Error saving note",
            description: error.message,
            variant: "destructive",
          });
        }
        
        // Cleanup
        stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        analyserRef.current = null;
        setRecordingTime(0);
        setDetectedEmotion(null);
        setWaveformData(Array(20).fill(0.3));
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Start waveform animation and emotion analysis
      waveformRef.current = setInterval(() => {
        updateWaveform();
        analyzeAudioEmotion();
      }, 200);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (waveformRef.current) {
        clearInterval(waveformRef.current);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getEmotionColor = (emotion: EmotionType) => {
    switch (emotion) {
      case 'happy': return 'bg-gradient-happy';
      case 'sad': return 'bg-gradient-sad';
      case 'neutral': return 'bg-gradient-neutral';
    }
  };

  return (
    <Card className="p-8 bg-gradient-background border-0 shadow-emotion">
      <div className="flex flex-col items-center space-y-6">
        {/* Recording Button */}
        <div className="relative">
          <Button
            size="lg"
            onClick={isRecording ? stopRecording : startRecording}
            className={`
              w-24 h-24 rounded-full transition-all duration-300
              ${isRecording 
                ? 'bg-destructive hover:bg-destructive/90 animate-pulse-recording shadow-recording' 
                : 'bg-gradient-primary hover:scale-105 shadow-emotion'
              }
            `}
          >
            {isRecording ? (
              <Square className="w-8 h-8 text-destructive-foreground" />
            ) : (
              <Mic className="w-8 h-8 text-primary-foreground" />
            )}
          </Button>
          
          {isRecording && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full animate-pulse" />
          )}
        </div>

        {/* Recording Status */}
        {isRecording && (
          <div className="text-center space-y-4 animate-fade-in-up">
            <div className="text-2xl font-semibold text-foreground">
              {formatTime(recordingTime)}
            </div>
            
            {/* Waveform Visualization */}
            <div className="flex items-end justify-center space-x-1 h-16">
              {waveformData.map((height, index) => (
                <div
                  key={index}
                  className="w-1 bg-primary rounded-full animate-waveform"
                  style={{ 
                    height: `${height * 100}%`,
                    animationDelay: `${index * 0.05}s`,
                  }}
                />
              ))}
            </div>

            {/* Emotion Detection */}
            {detectedEmotion && (
              <div className="animate-emotion-bounce">
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-white font-medium ${getEmotionColor(detectedEmotion)}`}>
                  Detected: {detectedEmotion.charAt(0).toUpperCase() + detectedEmotion.slice(1)}
                </div>
              </div>
            )}
          </div>
        )}

        {!isRecording && (
          <p className="text-muted-foreground text-center">
            Tap the microphone to start recording your voice note
          </p>
        )}
      </div>
    </Card>
  );
};