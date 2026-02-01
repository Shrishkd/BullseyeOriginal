import { motion } from 'framer-motion';
import { Bell, Lock, User, Database } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Settings() {
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold mb-2">
          <span className="gradient-text">Settings</span>
        </h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </motion.div>

      {/* Theme Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="glass p-6 border-border/50">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Appearance
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Theme</p>
              <p className="text-sm text-muted-foreground">Toggle between light and dark mode</p>
            </div>
            <ThemeToggle />
          </div>
        </Card>
      </motion.div>

      {/* Notification Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass p-6 border-border/50">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notifications
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border/50">
              <div>
                <p className="font-medium">Price Alerts</p>
                <p className="text-sm text-muted-foreground">Get notified when prices hit your targets</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-border/50">
              <div>
                <p className="font-medium">Volatility Alerts</p>
                <p className="text-sm text-muted-foreground">Alerts for unusual market movements</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-border/50">
              <div>
                <p className="font-medium">AI Predictions</p>
                <p className="text-sm text-muted-foreground">Daily AI-generated market insights</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">Portfolio Updates</p>
                <p className="text-sm text-muted-foreground">Weekly portfolio performance summaries</p>
              </div>
              <Switch />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Profile Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glass p-6 border-border/50">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profile
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-foreground">Full Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                className="mt-2 bg-background/50 border-border/50 focus:border-primary transition-smooth"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                className="mt-2 bg-background/50 border-border/50 focus:border-primary transition-smooth"
              />
            </div>

            <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-smooth">
              Save Changes
            </Button>
          </div>
        </Card>
      </motion.div>


      {/* Security */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="glass p-6 border-border/50">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Security
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="current-password" className="text-foreground">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="••••••••"
                className="mt-2 bg-background/50 border-border/50 focus:border-primary transition-smooth"
              />
            </div>

            <div>
              <Label htmlFor="new-password" className="text-foreground">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                className="mt-2 bg-background/50 border-border/50 focus:border-primary transition-smooth"
              />
            </div>

            <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-smooth">
              Update Password
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
