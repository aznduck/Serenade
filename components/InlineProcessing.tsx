import React, { useEffect, useState } from 'react';
import { Mail, Music, Brain, Sparkles, CheckCircle, Loader2, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export type ProcessingStep = 'gmail' | 'spotify' | 'claude' | 'suno' | 'complete';

export interface ProcessingState {
  currentStep: ProcessingStep;
  currentSubStep: string;
  progress: number;
  isProcessing: boolean;
  data: {
    gmailPreview?: string[];
    spotifyPreview?: string[];
    generatedPrompt?: string;
    error?: string;
  };
}

interface InlineProcessingProps {
  isVisible: boolean;
  processingState: ProcessingState;
  onCancel: () => void;
  onComplete: () => void;
}

const InlineProcessing: React.FC<InlineProcessingProps> = ({
  isVisible,
  processingState,
  onCancel,
  onComplete,
}) => {
  const [displayedPrompt, setDisplayedPrompt] = useState('');

  useEffect(() => {
    if (processingState.data.generatedPrompt && processingState.currentStep === 'claude') {
      let index = 0;
      const fullPrompt = processingState.data.generatedPrompt;
      const timer = setInterval(() => {
        if (index < fullPrompt.length) {
          setDisplayedPrompt(fullPrompt.substring(0, index + 1));
          index++;
        } else {
          clearInterval(timer);
        }
      }, 30);
      return () => clearInterval(timer);
    }
  }, [processingState.data.generatedPrompt, processingState.currentStep]);

  // Auto-complete after Suno step starts
  useEffect(() => {
    if (processingState.currentStep === 'suno' && processingState.progress >= 80) {
      const timer = setTimeout(() => {
        onComplete();
      }, 2000); // Give 2 seconds to show Suno started
      return () => clearTimeout(timer);
    }
  }, [processingState.currentStep, processingState.progress, onComplete]);

  if (!isVisible) return null;

  const steps = [
    {
      key: 'gmail' as ProcessingStep,
      icon: Mail,
      title: 'Gmail Collection',
      description: 'Analyzing your recent emails',
    },
    {
      key: 'spotify' as ProcessingStep,
      icon: Music,
      title: 'Spotify Analysis',
      description: 'Discovering your music taste',
    },
    {
      key: 'claude' as ProcessingStep,
      icon: Brain,
      title: 'AI Generation',
      description: 'Creating personalized prompt',
    },
    {
      key: 'suno' as ProcessingStep,
      icon: Sparkles,
      title: 'Music Creation',
      description: 'Composing your song',
    },
  ];

  const getStepStatus = (stepKey: ProcessingStep) => {
    const stepOrder = ['gmail', 'spotify', 'claude', 'suno'];
    const currentIndex = stepOrder.indexOf(processingState.currentStep);
    const stepIndex = stepOrder.indexOf(stepKey);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border border-blue-200/50 shadow-lg">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">Creating Your Personal Song</h3>
          <Button
            onClick={onCancel}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm text-gray-500">{Math.round(processingState.progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${processingState.progress}%` }}
            />
          </div>
        </div>

        {/* Compact Steps */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {steps.map((step) => {
            const status = getStepStatus(step.key);
            const IconComponent = step.icon;

            return (
              <div key={step.key} className={`text-center p-3 rounded-lg ${
                status === 'active' ? 'bg-blue-100 border border-blue-300' :
                status === 'completed' ? 'bg-green-100 border border-green-300' : 'bg-gray-50'
              }`}>
                <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                  status === 'completed' ? 'bg-green-500' :
                  status === 'active' ? 'bg-blue-500' : 'bg-gray-300'
                }`}>
                  {status === 'completed' ? (
                    <CheckCircle className="h-6 w-6 text-white" />
                  ) : status === 'active' ? (
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  ) : (
                    <IconComponent className="h-5 w-5 text-white" />
                  )}
                </div>
                <h4 className={`font-semibold text-sm ${
                  status === 'active' ? 'text-blue-900' :
                  status === 'completed' ? 'text-green-900' : 'text-gray-600'
                }`}>
                  {step.title}
                </h4>
              </div>
            );
          })}
        </div>

        {/* Current Activity */}
        {processingState.currentSubStep && (
          <div className="text-center">
            <p className="text-sm font-medium text-blue-700">
              {processingState.currentSubStep}
            </p>
          </div>
        )}

        {/* Data Previews */}
        <div className="space-y-3">
          {processingState.data.gmailPreview && (
            <div className="p-3 bg-white/60 rounded-lg border border-gray-200">
              <strong className="text-xs text-gray-600">Recent emails:</strong>
              <div className="mt-1 text-xs text-gray-700">
                {processingState.data.gmailPreview.slice(0, 2).map((subject, i) => (
                  <div key={i} className="truncate">• {subject}</div>
                ))}
              </div>
            </div>
          )}

          {processingState.data.spotifyPreview && (
            <div className="p-3 bg-white/60 rounded-lg border border-gray-200">
              <strong className="text-xs text-gray-600">Top artists:</strong>
              <p className="mt-1 text-xs text-gray-700">
                {processingState.data.spotifyPreview.slice(0, 3).join(', ')}
              </p>
            </div>
          )}

          {displayedPrompt && (
            <div className="p-3 bg-white/60 rounded-lg border border-gray-200">
              <strong className="text-xs text-gray-600">Generated Prompt:</strong>
              <p className="mt-1 text-xs text-gray-700 italic">"{displayedPrompt}"</p>
            </div>
          )}
        </div>

        {/* Error Display */}
        {processingState.data.error && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex">
              <X className="h-4 w-4 text-red-500 mt-0.5 mr-2" />
              <div>
                <h4 className="text-sm font-medium text-red-800">Processing Error</h4>
                <p className="text-sm text-red-700 mt-1">{processingState.data.error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default InlineProcessing;