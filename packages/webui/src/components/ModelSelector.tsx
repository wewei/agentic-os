import React, { useState, useEffect } from 'react';

import { Select } from '@/components/ui/select';
import { fetchAvailableModels, type TaskModelConfig } from '@/lib/messageService';

type ModelSelectorProps = {
  onModelSelect: (model: TaskModelConfig) => void;
  disabled?: boolean;
  className?: string;
};

type ModelState = {
  models: TaskModelConfig[];
  selectedModelIndex: number;
  isLoading: boolean;
  error: string | null;
};

const LoadingSelect: React.FC<{ className?: string }> = ({ className }) => (
  <Select disabled className={className}>
    <option>Loading models...</option>
  </Select>
);

const ErrorSelect: React.FC<{ className?: string; error: string | null }> = ({ 
  className, 
  error 
}) => (
  <Select disabled className={className}>
    <option>{error || 'No models available'}</option>
  </Select>
);

const ModelOptions: React.FC<{ models: TaskModelConfig[] }> = ({ models }) => (
  <>
    {models.map((model, index) => (
      <option key={`${model.provider}-${model.model}`} value={index}>
        {model.name}
      </option>
    ))}
  </>
);

const loadModels = async (
  setState: React.Dispatch<React.SetStateAction<ModelState>>,
  onModelSelect: (model: TaskModelConfig) => void
): Promise<void> => {
  try {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    const availableModels = await fetchAvailableModels();
    setState(prev => ({ ...prev, models: availableModels, isLoading: false }));
    if (availableModels.length > 0) {
      onModelSelect(availableModels[0]);
    }
  } catch (err) {
    console.error('Failed to load models:', err);
    setState(prev => ({ 
      ...prev, 
      error: 'Failed to load models', 
      isLoading: false 
    }));
  }
};

const ModelSelector: React.FC<ModelSelectorProps> = ({
  onModelSelect,
  disabled = false,
  className,
}) => {
  const [state, setState] = useState<ModelState>({
    models: [],
    selectedModelIndex: 0,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    loadModels(setState, onModelSelect);
  }, [onModelSelect]);

  const handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const index = parseInt(event.target.value, 10);
    setState(prev => ({ ...prev, selectedModelIndex: index }));
    if (state.models[index]) {
      onModelSelect(state.models[index]);
    }
  };

  if (state.isLoading) {
    return <LoadingSelect className={className} />;
  }

  if (state.error || state.models.length === 0) {
    return <ErrorSelect className={className} error={state.error} />;
  }

  return (
    <Select
      value={state.selectedModelIndex}
      onChange={handleModelChange}
      disabled={disabled}
      className={className}
    >
      <ModelOptions models={state.models} />
    </Select>
  );
};

export default ModelSelector;

