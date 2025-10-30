import { Button } from '@/components/ui/button';
import { Mic, Heart, BarChart3, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/notes');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-8">
          {/* Logo */}
          <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center shadow-emotion animate-fade-in">
            <Mic className="w-12 h-12 text-primary-foreground" />
          </div>

          {/* Main Heading */}
          <div className="space-y-4 animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-accent to-primary-glow bg-clip-text text-transparent">
              Voice Note Plus
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Capture your thoughts with emotion. Experience voice notes that understand how you feel.
            </p>
          </div>

          {/* CTA Button */}
          <Button
            size="lg"
            onClick={() => navigate('/auth')}
            className="bg-gradient-primary hover:scale-105 shadow-emotion text-lg px-8 py-6 h-auto animate-fade-in"
          >
            <Mic className="mr-2 h-5 w-5" />
            Start Recording
          </Button>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full max-w-4xl animate-fade-in">
            <div className="p-6 rounded-xl bg-card border border-border shadow-soft hover:shadow-emotion transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-gradient-happy flex items-center justify-center mb-4 mx-auto">
                <Heart className="w-6 h-6 text-happy-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Emotion Detection</h3>
              <p className="text-muted-foreground text-sm">
                AI-powered emotion recognition analyzes your voice in real-time
              </p>
            </div>

            <div className="p-6 rounded-xl bg-card border border-border shadow-soft hover:shadow-emotion transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-gradient-neutral flex items-center justify-center mb-4 mx-auto">
                <BarChart3 className="w-6 h-6 text-neutral-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Mood Analytics</h3>
              <p className="text-muted-foreground text-sm">
                Track your emotional patterns over time with beautiful charts
              </p>
            </div>

            <div className="p-6 rounded-xl bg-card border border-border shadow-soft hover:shadow-emotion transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-gradient-sad flex items-center justify-center mb-4 mx-auto">
                <Sparkles className="w-6 h-6 text-sad-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Smart Organization</h3>
              <p className="text-muted-foreground text-sm">
                Automatically organize notes by emotion and date
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
