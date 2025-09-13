import React, { useEffect, useState } from 'react';
import { X, Mail, Music, Brain, Sparkles, CheckCircle, Loader2 } from 'lucide-react';

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

interface ProcessingModalProps {
  isOpen: boolean;
  processingState: ProcessingState;
  onClose: () => void;
  onCancel: () => void;
}

const ProcessingModal: React.FC<ProcessingModalProps> = ({
  isOpen,
  processingState,
  onClose,
  onCancel,
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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Creating Your Personal Song</h2>
          <button
            onClick={processingState.currentStep === 'complete' ? onClose : onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm text-gray-500">{Math.round(processingState.progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${processingState.progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step) => {
            const status = getStepStatus(step.key);
            const IconComponent = step.icon;

            return (
              <div key={step.key} className={`flex items-start space-x-4 ${
                status === 'active' ? 'bg-blue-50 p-4 rounded-lg' : 'p-2'
              }`}>
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  status === 'completed' ? 'bg-green-100' :
                  status === 'active' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  {status === 'completed' ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : status === 'active' ? (
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  ) : (
                    <IconComponent className={`h-5 w-5 ${
                      status === 'active' ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                  )}
                </div>

                <div className="flex-1">
                  <h3 className={`font-semibold ${
                    status === 'active' ? 'text-blue-900' :
                    status === 'completed' ? 'text-green-900' : 'text-gray-600'
                  }`}>
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">{step.description}</p>

                  {/* Current Sub-step */}
                  {status === 'active' && (
                    <p className="text-sm text-blue-700 font-medium mb-2">
                      {processingState.currentSubStep}
                    </p>
                  )}

                  {/* Data Previews */}
                  {step.key === 'gmail' && processingState.data.gmailPreview && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                      <strong>Recent emails:</strong>
                      <ul className="mt-1 space-y-1">
                        {processingState.data.gmailPreview.slice(0, 3).map((subject, i) => (
                          <li key={i} className="truncate">• {subject}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {step.key === 'spotify' && processingState.data.spotifyPreview && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                      <strong>Top artists:</strong>
                      <p className="mt-1">{processingState.data.spotifyPreview.slice(0, 3).join(', ')}</p>
                    </div>
                  )}

                  {step.key === 'claude' && displayedPrompt && (
                    <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                      <strong>Generated Prompt:</strong>
                      <p className="mt-1 italic">"{displayedPrompt}"</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Error Display */}
        {processingState.data.error && (
          <div className="mt-6 p-4 bg-red-50 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <X className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Processing Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{processingState.data.error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-8">
          {processingState.currentStep !== 'complete' && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          {processingState.currentStep === 'complete' && (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProcessingModal;