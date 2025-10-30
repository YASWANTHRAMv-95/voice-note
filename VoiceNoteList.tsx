import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Play, Pause, Search, Heart, Meh, Frown } from 'lucide-react';
import { VoiceNote, EmotionType } from '@/types/voice-note';

interface VoiceNoteListProps {
  notes: VoiceNote[];
  onDeleteNote: (id: string) => void;
}

export const VoiceNoteList = ({ notes, onDeleteNote }: VoiceNoteListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType | 'all'>('all');
  const [playingNoteId, setPlayingNoteId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEmotion = selectedEmotion === 'all' || note.emotion === selectedEmotion;
    return matchesSearch && matchesEmotion;
  });

  const playNote = (note: VoiceNote) => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    if (playingNoteId === note.id) {
      setPlayingNoteId(null);
      setCurrentAudio(null);
      return;
    }

    const audio = new Audio(note.audioUrl);
    audio.play();
    setPlayingNoteId(note.id);
    setCurrentAudio(audio);

    audio.onended = () => {
      setPlayingNoteId(null);
      setCurrentAudio(null);
    };
  };

  const getEmotionIcon = (emotion: EmotionType) => {
    switch (emotion) {
      case 'happy': return <Heart className="w-4 h-4" />;
      case 'sad': return <Frown className="w-4 h-4" />;
      case 'neutral': return <Meh className="w-4 h-4" />;
    }
  };

  const getEmotionColor = (emotion: EmotionType) => {
    switch (emotion) {
      case 'happy': return 'bg-happy text-happy-foreground';
      case 'sad': return 'bg-sad text-sad-foreground';
      case 'neutral': return 'bg-neutral text-neutral-foreground';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const emotionButtons: { key: EmotionType | 'all', label: string, color: string }[] = [
    { key: 'all', label: 'All', color: 'bg-primary text-primary-foreground' },
    { key: 'happy', label: 'Happy', color: 'bg-happy text-happy-foreground' },
    { key: 'neutral', label: 'Neutral', color: 'bg-neutral text-neutral-foreground' },
    { key: 'sad', label: 'Sad', color: 'bg-sad text-sad-foreground' },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-card border-0 shadow-soft">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search voice notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-0 bg-secondary focus-visible:ring-primary"
            />
          </div>

          {/* Emotion Filter */}
          <div className="flex flex-wrap gap-2">
            {emotionButtons.map(({ key, label, color }) => (
              <Button
                key={key}
                variant={selectedEmotion === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedEmotion(key)}
                className={selectedEmotion === key ? color : ''}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Notes List */}
      <div className="space-y-4">
        {filteredNotes.length === 0 ? (
          <Card className="p-8 text-center bg-card border-0 shadow-soft">
            <p className="text-muted-foreground">
              {notes.length === 0 
                ? "No voice notes yet. Start recording to create your first note!" 
                : "No notes match your current filters."
              }
            </p>
          </Card>
        ) : (
          filteredNotes.map((note) => (
            <Card key={note.id} className="p-4 bg-card border-0 shadow-soft hover:shadow-emotion transition-all duration-300 animate-fade-in-up">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <Button
                    size="sm"
                    onClick={() => playNote(note)}
                    className="w-12 h-12 rounded-full bg-gradient-primary hover:scale-105 transition-transform"
                  >
                    {playingNoteId === note.id ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5" />
                    )}
                  </Button>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">
                      {note.title}
                    </h3>
                    <div className="flex items-center space-x-3 mt-1">
                      <Badge className={`${getEmotionColor(note.emotion)} text-xs`}>
                        {getEmotionIcon(note.emotion)}
                        <span className="ml-1 capitalize">{note.emotion}</span>
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(note.duration)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {note.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDeleteNote(note.id)}
                  className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};