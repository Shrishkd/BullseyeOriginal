import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function Predictions() {
  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold mb-2">
          <span className="gradient-text">AI Predictions</span>
        </h1>
        <p className="text-muted-foreground">Machine learning powered market forecasts</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6"
      >
        <Card className="glass p-12 border-border/50 text-center">
          <Brain className="h-16 w-16 text-secondary mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">AI Predictions Coming Soon</h2>
          <p className="text-muted-foreground">
            Advanced ML models and price predictions will be available here
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
