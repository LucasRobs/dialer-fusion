
import { supabase } from '@/lib/supabase';

export type TrainingModel = {
  id: number;
  name: string;
  description?: string;
  status: 'draft' | 'training' | 'active';
  created_at?: string;
  last_trained?: string;
};

export type TrainingData = {
  id: number;
  model_id: number;
  prompt: string;
  response: string;
  created_at?: string;
};

export const trainingService = {
  // Buscar todos os modelos de treinamento
  async getTrainingModels() {
    const { data, error } = await supabase
      .from('training_models')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as TrainingModel[];
  },

  // Buscar um modelo por ID
  async getTrainingModelById(id: number) {
    const { data, error } = await supabase
      .from('training_models')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as TrainingModel;
  },

  // Criar um novo modelo de treinamento
  async createTrainingModel(model: Omit<TrainingModel, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('training_models')
      .insert([model])
      .select();
    
    if (error) throw error;
    return data[0] as TrainingModel;
  },

  // Adicionar dados de treinamento
  async addTrainingData(trainingData: Omit<TrainingData, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('training_data')
      .insert([trainingData])
      .select();
    
    if (error) throw error;
    return data[0] as TrainingData;
  },

  // Buscar dados de treinamento para um modelo
  async getTrainingDataForModel(modelId: number) {
    const { data, error } = await supabase
      .from('training_data')
      .select('*')
      .eq('model_id', modelId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data as TrainingData[];
  },

  // Iniciar treinamento de um modelo
  async startTraining(modelId: number) {
    // Normalmente, isso chamaria uma função Edge do Supabase
    // para realizar o treinamento em background
    const { data, error } = await supabase
      .from('training_models')
      .update({ status: 'training' })
      .eq('id', modelId)
      .select();
    
    if (error) throw error;
    return data[0] as TrainingModel;
  }
};
