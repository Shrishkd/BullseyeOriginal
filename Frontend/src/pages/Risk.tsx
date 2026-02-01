import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function Risk() {
  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold mb-2">
          <span className="gradient-text">Risk Analysis</span>
        </h1>
        <p className="text-muted-foreground">Volatility metrics and risk assessments</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6"
      >
        <Card className="glass p-12 border-border/50 text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Risk Analysis Coming Soon</h2>
          <p className="text-muted-foreground">
            Comprehensive risk metrics and analysis tools will be available here
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
