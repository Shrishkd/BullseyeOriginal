import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Brain,
  PieChart,
  MessageSquare,
  ShieldAlert,
  Bell,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';

const features = [
  {
    icon: TrendingUp,
    title: 'Real-Time Market Data',
    description: 'Live stock and crypto prices with instant updates',
  },
  {
    icon: Brain,
    title: 'AI Predictions',
    description: 'Machine learning models forecast market trends',
  },
  {
    icon: PieChart,
    title: 'Portfolio Analyzer',
    description: 'Track allocations, returns, and growth metrics',
  },
  {
    icon: MessageSquare,
    title: 'AI Chat Assistant',
    description: 'Get instant answers to your investment questions',
  },
  {
    icon: ShieldAlert,
    title: 'Risk Insights',
    description: 'Volatility, Sharpe ratio, and risk classification',
  },
  {
    icon: Bell,
    title: 'Smart Alerts',
    description: 'Customized notifications for price and volatility',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="h-10 w-10 rounded-lg flex items-center justify-center">
              <img src="/favicon.ico" alt="Bullseye" className="h-10 w-10" />
            </div>
            <span className="text-2xl font-bold gradient-text">Bullseye</span>
          </motion.div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link to="/login">
              <Button variant="ghost" className="transition-smooth">
                Login
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-smooth glow-primary">
                New User
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center space-y-8"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-block"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/20 glow-primary mb-6">
                <Brain className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  Powered by Advanced AI
                </span>
              </div>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              <span className="gradient-text">AI-Powered</span>
              <br />
              Investment & Trading
              <br />
              Assistant
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Leverage predictive models, sentiment analysis, and smart insights to make
              data-driven investment decisions with confidence.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link to="/signup">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-smooth glow-primary text-lg px-8"
                >
                  New User
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="glass hover:glass-strong transition-smooth text-lg px-8"
                >
                  Login
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Floating decoration */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="mt-16 relative h-64 max-w-4xl mx-auto"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 rounded-3xl blur-3xl"></div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to <span className="gradient-text">Trade Smarter</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our platform combines cutting-edge AI with real-time data to give you the
              competitive edge.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                className="glass rounded-2xl p-6 hover:glass-strong transition-smooth border border-border/50 hover:border-primary/30 group cursor-pointer"
              >
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4 group-hover:glow-primary transition-smooth">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass-strong rounded-3xl p-12 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10"></div>
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Ready to <span className="gradient-text">Transform</span> Your Trading?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Join thousands of traders using AI to make smarter investment decisions.
              </p>
              <Link to="/signup">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-smooth glow-primary text-lg px-12"
                >
                  Get Started Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/50">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>© 2025 Bullseye. AI-Powered Investment Platform.</p>
        </div>
      </footer>
    </div>
  );
}
