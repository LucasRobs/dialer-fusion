import { supabase } from './supabase';

export async function checkPremiumAccess(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_payments')
      .select('status')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .single();

    if (error) {
      console.error('Erro ao verificar acesso premium:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Erro ao verificar acesso premium:', error);
    return false;
  }
}

export async function requirePremiumAccess(userId: string): Promise<void> {
  const hasAccess = await checkPremiumAccess(userId);
  if (!hasAccess) {
    throw new Error('Acesso premium necessário');
  }
} 