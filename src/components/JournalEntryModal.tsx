import React, { useState } from 'react';
import { X, Save, Image, Trophy, MapPin, Sword, FileText, Calendar, Clock, TrendingUp, AlertTriangle } from 'lucide-react';

interface JournalEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: any) => void;
  game: any;
}

const JournalEntryModal: React.FC<JournalEntryModalProps> = ({ isOpen, onClose, onSave, game }) => {
  const [entryData, setEntryData] = useState({
    title: '',
    areaExplored: '',
    bossDefeated: '',
    itemFound: '',
    screenshot: '',
    notes: '',
    mood: 'neutral',
    sessionLength: '',
    progress: game.progress.toString(),
    tags: [] as string[]
  });

  const [activeTag, setActiveTag] = useState('');
  const [progressError, setProgressError] = useState('');

  // Ordered from happy to unhappy with neutral in middle - Fixed neutral color
  const moods = [
    { id: 'excited', label: 'Excited', color: 'bg-secondary/20 text-secondary' },
    { id: 'satisfied', label: 'Satisfied', color: 'bg-accent/20 text-accent' },
    { id: 'neutral', label: 'Neutral', color: 'bg-neutral/20 text-neutral' },
    { id: 'emotional', label: 'Emotional', color: 'bg-primary/20 text-primary' },
    { id: 'frustrated', label: 'Frustrated', color: 'bg-destructive/20 text-destructive' }
  ];

  const commonTags = ['Boss Fight', 'Story Beat', 'Side Quest', 'Exploration', 'Character Development', 'Epic Moment'];

  const handleProgressChange = (value: string) => {
    const numValue = parseFloat(value);
    console.log('📊 Progress changed to:', numValue, 'Current game progress:', game.progress);
    
    if (value === '') {
      setEntryData(prev => ({ ...prev, progress: '' }));
      setProgressError('');
      return;
    }

    if (isNaN(numValue) || numValue < 0 || numValue > 100) {
      setProgressError('Progress must be between 0 and 100');
      setEntryData(prev => ({ ...prev, progress: value }));
      return;
    }

    if (numValue < game.progress) {
      setProgressError(`Progress cannot be lower than current progress (${game.progress}%)`);
      setEntryData(prev => ({ ...prev, progress: value }));
      return;
    }

    setProgressError('');
    setEntryData(prev => ({ ...prev, progress: value }));
  };

  const handleSave = () => {
    console.log('💾 Saving journal entry:', entryData);
    if (!entryData.title.trim()) {
      console.warn('⚠️ Cannot save entry without title');
      return;
    }

    if (progressError) {
      console.warn('⚠️ Cannot save entry with progress validation error');
      return;
    }
    
    const newEntry = {
      ...entryData,
      date: new Date().toISOString(),
      game: game.title,
      id: Date.now(),
      content: entryData.notes, // Map notes to content for compatibility
      progress: entryData.progress ? parseFloat(entryData.progress) : game.progress
    };
    
    console.log('✅ New journal entry created:', newEntry);
    onSave(newEntry);
    
    setEntryData({
      title: '',
      areaExplored: '',
      bossDefeated: '',
      itemFound: '',
      screenshot: '',
      notes: '',
      mood: 'neutral',
      sessionLength: '',
      progress: game.progress.toString(),
      tags: []
    });
    
    setProgressError('');
    console.log('🎯 Journal entry modal closed');
    onClose();
  };

  const addTag = (tag: string) => {
    console.log('🏷️ Adding tag:', tag);
    if (tag && !entryData.tags.includes(tag)) {
      setEntryData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      console.log('✅ Tag added successfully');
    } else {
      console.log('⚠️ Tag already exists or is empty');
    }
    setActiveTag('');
  };

  const removeTag = (tagToRemove: string) => {
    console.log('🗑️ Removing tag:', tagToRemove);
    setEntryData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  if (!isOpen) return null;

  console.log('📝 Journal entry modal opened for game:', game.title);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4 journal-card vhs-glow z-depth-4 rounded-lg">
        {/* Header */}
        <div className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border/50 p-6 scanlines">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={game.cover}
                alt={game.title}
                className="w-12 h-16 object-cover rounded border z-depth-1"
              />
              <div>
                <h2 className="text-2xl readable-accent" style={{ color: game.colors.primary }}>
                  New Journal Entry
                </h2>
                <p className="text-muted-foreground">{game.title}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted/50 rounded-lg fast-transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Entry Title */}
          <div className="space-y-2">
            <label className="block text-sm readable-text">
              <FileText className="w-4 h-4 inline mr-2" />
              Entry Title *
            </label>
            <input
              type="text"
              value={entryData.title}
              onChange={(e) => setEntryData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Epic boss fight, story revelation, etc..."
              className="w-full px-4 py-3 bg-input/50 border border-border/50 rounded-lg readable-text focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 smooth-transition"
            />
          </div>

          {/* Session Info and Progress */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-sm readable-text">
                <Clock className="w-4 h-4 inline mr-2" />
                Session Length
              </label>
              <input
                type="text"
                value={entryData.sessionLength}
                onChange={(e) => setEntryData(prev => ({ ...prev, sessionLength: e.target.value }))}
                placeholder="2h 30m"
                className="w-full px-4 py-3 bg-input/50 border border-border/50 rounded-lg readable-text focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 smooth-transition"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm readable-text">
                <TrendingUp className="w-4 h-4 inline mr-2" />
                Progress %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={entryData.progress}
                onChange={(e) => handleProgressChange(e.target.value)}
                placeholder={game.progress.toString()}
                className={`vaporwave-number-input w-full px-4 py-3 bg-input/50 border rounded-lg readable-text focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 smooth-transition ${
                  progressError ? 'progress-error' : 'border-border/50'
                }`}
              />
              {progressError && (
                <div className="flex items-center gap-1 progress-error-text">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{progressError}</span>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                Current: {game.progress}%
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm readable-text">Mood (Happy → Unhappy)</label>
              <div className="flex flex-wrap gap-1">
                {moods.map(mood => (
                  <button
                    key={mood.id}
                    onClick={() => {
                      console.log('😊 Mood selected:', mood.label);
                      setEntryData(prev => ({ ...prev, mood: mood.id }));
                    }}
                    className={`px-2 py-1 rounded-full text-xs fast-transition ${
                      entryData.mood === mood.id ? mood.color : 'bg-muted/20 text-muted-foreground'
                    }`}
                  >
                    {mood.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Segmented Input Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-sm readable-text">
                <MapPin className="w-4 h-4 inline mr-2" />
                Area Explored
              </label>
              <input
                type="text"
                value={entryData.areaExplored}
                onChange={(e) => setEntryData(prev => ({ ...prev, areaExplored: e.target.value }))}
                placeholder="Night City Downtown"
                className="w-full px-3 py-2 bg-input/50 border border-border/50 rounded-lg readable-text focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 smooth-transition"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm readable-text">
                <Sword className="w-4 h-4 inline mr-2" />
                Boss Defeated
              </label>
              <input
                type="text"
                value={entryData.bossDefeated}
                onChange={(e) => setEntryData(prev => ({ ...prev, bossDefeated: e.target.value }))}
                placeholder="Adam Smasher"
                className="w-full px-3 py-2 bg-input/50 border border-border/50 rounded-lg readable-text focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 smooth-transition"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm readable-text">
                <Trophy className="w-4 h-4 inline mr-2" />
                Item Found
              </label>
              <input
                type="text"
                value={entryData.itemFound}
                onChange={(e) => setEntryData(prev => ({ ...prev, itemFound: e.target.value }))}
                placeholder="Legendary Katana"
                className="w-full px-3 py-2 bg-input/50 border border-border/50 rounded-lg readable-text focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 smooth-transition"
              />
            </div>
          </div>

          {/* Screenshot */}
          <div className="space-y-2">
            <label className="block text-sm readable-text">
              <Image className="w-4 h-4 inline mr-2" />
              Screenshot URL (Optional)
            </label>
            <input
              type="url"
              value={entryData.screenshot}
              onChange={(e) => setEntryData(prev => ({ ...prev, screenshot: e.target.value }))}
              placeholder="https://example.com/screenshot.jpg"
              className="w-full px-4 py-3 bg-input/50 border border-border/50 rounded-lg readable-text focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 smooth-transition"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="block text-sm readable-text">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {entryData.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-primary/20 text-primary rounded-full text-xs flex items-center gap-1"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-primary/70 fast-transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {commonTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => addTag(tag)}
                  className="px-2 py-1 bg-muted/20 text-muted-foreground rounded-full text-xs hover:bg-primary/20 hover:text-primary fast-transition"
                >
                  + {tag}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={activeTag}
              onChange={(e) => setActiveTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTag(activeTag)}
              placeholder="Add custom tag..."
              className="w-full px-4 py-2 bg-input/50 border border-border/50 rounded-lg readable-text focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 smooth-transition"
            />
          </div>

          {/* Freeform Notes */}
          <div className="space-y-2">
            <label className="block text-sm readable-text">
              <FileText className="w-4 h-4 inline mr-2" />
              Notes
            </label>
            <textarea
              value={entryData.notes}
              onChange={(e) => setEntryData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Write about your experience, thoughts, memorable moments..."
              rows={6}
              className="w-full px-4 py-3 bg-input/50 border border-border/50 rounded-lg readable-text focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 smooth-transition resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <button
              onClick={() => {
                console.log('❌ Journal entry cancelled');
                onClose();
              }}
              className="px-4 py-2 text-muted-foreground hover:text-foreground fast-transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!entryData.title.trim() || !!progressError}
              className="px-6 py-2 bg-primary/20 text-primary border border-primary/50 rounded-lg hover:bg-primary/30 disabled:opacity-50 disabled:cursor-not-allowed fast-transition interactive-hover"
            >
              <Save className="w-4 h-4 inline mr-2" />
              Save Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JournalEntryModal;