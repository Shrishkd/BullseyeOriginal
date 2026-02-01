import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSent(true);
      toast.success('Password reset email sent!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5"></div>
      <div className="absolute top-1/4 left-1/4 h-64 w-64 bg-primary/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 h-64 w-64 bg-secondary/20 rounded-full blur-3xl"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-strong rounded-3xl p-8 border border-border/50">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="h-16 w-16 rounded-xl flex items-center justify-center">
              <img src="/favicon.ico" alt="Bullseye" className="h-16 w-16" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
            <p className="text-muted-foreground">
              {sent
                ? 'Check your email for reset instructions'
                : 'Enter your email to receive reset instructions'}
            </p>
          </div>

          {!sent ? (
            <form onSubmit={handleReset} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-background/50 border-border/50 focus:border-primary transition-smooth"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-smooth glow-primary"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center">
                <Mail className="h-8 w-8 text-accent" />
              </div>
              <p className="text-muted-foreground">
                We've sent password reset instructions to <strong>{email}</strong>
              </p>
            </div>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Remember your password?{' '}
            <Link
              to="/login"
              className="text-primary hover:text-primary/80 font-medium transition-smooth"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              ← Back to Home
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
