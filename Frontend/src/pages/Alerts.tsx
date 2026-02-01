import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function Alerts() {
  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold mb-2">
          <span className="gradient-text">Alerts</span>
        </h1>
        <p className="text-muted-foreground">Manage your price and volatility alerts</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6"
      >
        <Card className="glass p-12 border-border/50 text-center">
          <Bell className="h-16 w-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Alerts Coming Soon</h2>
          <p className="text-muted-foreground">
            Customizable price and market alerts will be available here
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
