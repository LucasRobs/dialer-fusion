import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface AuthFormProps {
  type: 'login' | 'register';
}

const AuthForm: React.FC<AuthFormProps> = ({ type }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset network error
    setNetworkError(null);
    
    // Validation
    if (!email || !password) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }
    
    if (type === 'register') {
      if (password !== confirmPassword) {
        toast({
          title: "Erro",
          description: "As senhas não coincidem",
          variant: "destructive"
        });
        return;
      }
    }
    
    setIsLoading(true);
    
    try {
      if (type === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          throw error;
        }
        toast({
          title: "Sucesso",
          description: "Login realizado com sucesso"
        });
        navigate('/dashboard');
      } else {
        // Register
        const userData = {
          name,
          company
        };
        
        const { error } = await signUp(email, password, userData);
        if (error) {
          throw error;
        }
        
        toast({
          title: "Conta criada",
          description: "Sua conta foi criada com sucesso"
        });
        
        // Redirect to dashboard or login
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      
      // Check if it's a network error
      if (error.message && 
          (error.message.includes('Failed to fetch') || 
           error.message.includes('NetworkError') || 
           error.message.includes('network') ||
           error.message.includes('timeout') ||
           error.message.includes('connection') ||
           error.status === 503)) {
        
        setNetworkError("Não foi possível conectar ao servidor. Verifique sua conexão de internet e tente novamente.");
      } else {
        // Handle other auth errors
        toast({
          title: "Erro",
          description: error.message || "Ocorreu um erro durante a autenticação",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 glass rounded-xl">
      <h2 className="text-2xl font-bold mb-6 text-center">
        {type === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
      </h2>
      
      {networkError && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2 text-sm">
          <AlertTriangle size={16} className="text-destructive" />
          <span>{networkError}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {type === 'register' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company">Nome da empresa</Label>
              <Input
                id="company"
                type="text"
                placeholder="Sua empresa"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
              />
            </div>
          </>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu.email@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        {type === 'register' && (
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirme a senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        )}
        
        <Button 
          type="submit" 
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          {type === 'login' ? 'Entrar' : 'Criar conta'}
          {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </form>
      
      <div className="mt-6 text-center text-sm">
        {type === 'login' ? (
          <p>
            Não tem uma conta?{' '}
            <Link to="/register" className="text-secondary font-medium hover:underline">
              Cadastre-se
            </Link>
          </p>
        ) : (
          <p>
            Já tem uma conta?{' '}
            <Link to="/login" className="text-secondary font-medium hover:underline">
              Entrar
            </Link>
          </p>
        )}
      </div>
      
      {/* Offline mode hint */}
      {networkError && (
        <div className="mt-4 px-4 py-3 bg-muted rounded-lg text-sm text-center">
          <p className="font-medium mb-1">Se estiver com problemas de conexão:</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Verifique sua conexão com a internet</li>
            <li>• Tente novamente em alguns instantes</li>
            <li>• Entre em contato com o suporte se o problema persistir</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default AuthForm;
