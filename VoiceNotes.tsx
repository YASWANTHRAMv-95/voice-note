import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { VoiceNoteList } from '@/components/VoiceNoteList';
import { EmotionChart } from '@/components/EmotionChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VoiceNote } from '@/types/voice-note';
import { Mic, Library, TrendingUp, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const VoiceNotes = () => {
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Load notes from database
  useEffect(() => {
    if (!user) return;
    
    const loadNotes = async () => {
      const { data, error } = await supabase
        .from('voice_notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading notes:', error);
        toast({
          title: "Error loading notes",
          description: error.message,
          variant: "destructive",
        });
      } else if (data) {
        // Convert database records to VoiceNote format with audio URLs
        const notesWithUrls = await Promise.all(
          data.map(async (note) => {
            const { data: urlData } = await supabase.storage
              .from('voice-notes')
              .createSignedUrl(note.audio_path, 3600);

            return {
              id: note.id,
              title: note.title,
              audioBlob: new Blob(), // Not needed when loading from DB
              audioUrl: urlData?.signedUrl || '',
              emotion: note.emotion as 'happy' | 'neutral' | 'sad',
              duration: note.duration,
              createdAt: new Date(note.created_at),
              transcript: note.transcript,
            };
          })
        );
        setNotes(notesWithUrls);
      }
      setLoading(false);
    };

    loadNotes();
  }, [user, toast]);

  const handleNoteCreated = (newNote: VoiceNote) => {
    setNotes(prev => [newNote, ...prev]);
    toast({
      title: "Voice note saved!",
      description: `Detected emotion: ${newNote.emotion}`,
    });
  };

  const handleDeleteNote = async (noteId: string) => {
    const noteToDelete = notes.find(note => note.id === noteId);
    if (!noteToDelete) return;

    const { error } = await supabase
      .from('voice_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
      return;
    }

    setNotes(prev => prev.filter(note => note.id !== noteId));
    toast({
      title: "Note deleted",
      description: "Voice note has been removed.",
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <div></div>
            <h1 className="text-4xl font-bold text-foreground">
              Voice Note+
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
          <p className="text-lg text-muted-foreground">
            Record, analyze emotions, and track your voice notes
          </p>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="record" className="space-y-6">
          <Card className="p-1 bg-card border-0 shadow-soft w-fit mx-auto">
            <TabsList className="grid w-full grid-cols-3 bg-transparent">
              <TabsTrigger value="record" className="flex items-center space-x-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
                <Mic className="w-4 h-4" />
                <span>Record</span>
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex items-center space-x-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
                <Library className="w-4 h-4" />
                <span>Notes ({notes.length})</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center space-x-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
                <TrendingUp className="w-4 h-4" />
                <span>Analytics</span>
              </TabsTrigger>
            </TabsList>
          </Card>

          <TabsContent value="record" className="space-y-6">
            <div className="max-w-lg mx-auto">
              <VoiceRecorder onNoteCreated={handleNoteCreated} />
            </div>
            
            {/* Recent Notes Preview */}
            {notes.length > 0 && (
              <div className="max-w-2xl mx-auto">
                <h2 className="text-xl font-semibold text-foreground mb-4">Recent Notes</h2>
                <div className="space-y-3">
                  {notes.slice(0, 3).map((note) => (
                    <Card key={note.id} className="p-4 bg-card border-0 shadow-soft">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-foreground">{note.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {note.emotion} • {Math.floor(note.duration / 60)}:{(note.duration % 60).toString().padStart(2, '0')}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {note.createdAt.toLocaleDateString()}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-6">
            <VoiceNoteList 
              notes={notes} 
              onDeleteNote={handleDeleteNote}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <EmotionChart notes={notes} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};