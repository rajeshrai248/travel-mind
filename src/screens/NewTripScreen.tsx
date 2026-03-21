import { useState } from 'react';
import { useTripStore } from '../store/tripStore';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { CloudUpload, Camera, FileText, Check, Loader2, X } from 'lucide-react';
import { cn } from '../utils/cn';
import axios from 'axios';
import { Orchestrator } from '../agents/orchestrator';

export function NewTripScreen({ onComplete }: { onComplete: () => void }) {
  const { context, setContext, setStatus } = useTripStore();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState(0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStep(1);

    const formData = new FormData();
    formData.append('ticket', file);

    try {
      const response = await axios.post('/api/parse-ticket', formData);
      setUploadStep(2);
      
      const orchestrator = new Orchestrator(process.env.GEMINI_API_KEY!);
      const result = await orchestrator.processInput(context, { type: 'pdf', data: response.data.text });
      
      setContext(result);
      setUploadStep(3);
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error) {
      console.error('Upload error:', error);
      setIsUploading(false);
    }
  };

  return (
    <div className="px-6 pt-12 space-y-12">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <X className="text-primary cursor-pointer" onClick={() => onComplete()} />
          <span className="font-headline font-bold text-xl">TravelMind</span>
        </div>
      </header>

      <section className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-on-surface">Let's start your trip</h2>
          <p className="text-on-surface-variant text-lg">
            Upload your flight itinerary and let TravelMind handle the logistics.
          </p>
        </div>

        {!isUploading ? (
          <div className="border-2 border-dashed border-outline-variant rounded-2xl p-12 bg-surface-container-lowest flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center">
              <CloudUpload size={32} className="text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold">Upload your flight ticket</h3>
              <p className="text-on-surface-variant text-sm">PDF, photo, or screenshot</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center pt-2">
              <label className="bg-primary text-on-primary px-8 py-3 rounded-xl font-semibold shadow-sm active:scale-95 duration-200 cursor-pointer text-center">
                Choose File
                <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,image/*" />
              </label>
              <Button variant="outline">
                <Camera size={18} />
                Take Photo
              </Button>
            </div>
          </div>
        ) : (
          <Card className="bg-surface-container-low space-y-8">
            <div className="flex items-center gap-6">
              <div className="relative w-16 h-16">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center relative z-10">
                  <Loader2 size={32} className="text-on-primary animate-spin" />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-lg">TicketReader Agent</h4>
                <p className="text-on-surface-variant">TicketReader is analyzing your ticket...</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Document uploaded', step: 1 },
                { label: 'Text extracted', step: 2 },
                { label: 'Flight details found', step: 3 },
                { label: 'Travel dates confirmed', step: 3 },
              ].map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    'flex items-center gap-3 transition-opacity',
                    uploadStep >= item.step ? 'text-primary' : 'text-on-surface-variant/40'
                  )}
                >
                  {uploadStep >= item.step ? <Check size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
                  <span className="text-sm font-semibold">{item.label}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
