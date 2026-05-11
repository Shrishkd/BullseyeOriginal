import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  TrendingUp,
  Brain,
  PieChart,
  MessageSquare,
  ShieldAlert,
  Bell,
  ArrowRight,
  Link as LinkIcon,
  BarChart3,
  DollarSign,
  Zap,
  Shield,
  Globe,
  ChevronDown,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useRef } from 'react';

/* ───────────────────────── Data ───────────────────────── */

const features = [
  {
    icon: TrendingUp,
    title: 'Real-Time Market Data',
    description: 'Live stock and crypto prices with instant updates and streaming feeds.',
  },
  {
    icon: Brain,
    title: 'AI Predictions',
    description: 'Machine learning models powered by XGBoost, LSTM & sentiment analysis.',
  },
  {
    icon: PieChart,
    title: 'Portfolio Analyzer',
    description: 'Track allocations, returns, growth metrics & rebalancing insights.',
  },
  {
    icon: MessageSquare,
    title: 'AI Chat Assistant',
    description: 'Get instant answers to your investment questions with Gemini AI.',
  },
  {
    icon: ShieldAlert,
    title: 'Risk Insights',
    description: 'Volatility, Sharpe ratio, drawdown analysis & risk classification.',
  },
  {
    icon: Bell,
    title: 'Smart Alerts',
    description: 'Customized notifications for price movements and volatility spikes.',
  },
];

const stats = [
  { value: '99%', label: 'Uptime' },
  { value: '2', label: 'AI Models' },
  { value: '₹1Cr+', label: 'Data Analyzed' },
  { value: '500+', label: 'Traders' },
];

const steps = [
  {
    icon: LinkIcon,
    title: 'Connect',
    description: 'Link your portfolio or start fresh with our guided onboarding.',
    step: '01',
  },
  {
    icon: BarChart3,
    title: 'Analyze',
    description: 'Our AI engine processes real-time data and generates actionable insights.',
    step: '02',
  },
  {
    icon: DollarSign,
    title: 'Profit',
    description: 'Execute smarter trades with confidence backed by data-driven predictions.',
    step: '03',
  },
];

/* ─────────────────────── Variants ─────────────────────── */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] },
  },
};

/* ═══════════════════════ Component ═══════════════════════ */

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroImageY = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ───────── Ambient Background ───────── */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px]" />
      </div>

      {/* ═══════════════════ HEADER ═══════════════════ */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between max-w-7xl">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2.5"
          >
            <div className="h-10 w-10 rounded-lg flex items-center justify-center">
              <img src="/favicon.ico" alt="Bullseye" className="h-10 w-10" />
            </div>
            <span className="text-2xl font-bold gradient-text tracking-tight">
              Bullseye
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <ThemeToggle />
            <Link to="/login">
              <Button
                variant="ghost"
                className="transition-smooth text-muted-foreground hover:text-foreground"
              >
                Login
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-smooth glow-primary rounded-full px-6">
                Get Started
              </Button>
            </Link>
          </motion.div>
        </div>
      </header>

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section ref={heroRef} className="relative pt-32 pb-16 lg:pt-40 lg:pb-24 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Left — Copy */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8 text-center lg:text-left"
            >
              {/* Badge */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="inline-flex"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/20 glow-primary">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    Powered by Advanced AI
                  </span>
                </div>
              </motion.div>

              {/* Headline */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.08] tracking-tight">
                <span className="gradient-text">AI-Powered</span>
                <br />
                <span className="text-foreground">Investment &amp; Trading</span>
                <br />
                <span className="text-foreground">Assistant</span>
              </h1>

              {/* Subtext */}
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Leverage predictive models, sentiment analysis, and smart insights to
                make data-driven investment decisions with confidence.
              </p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center"
              >
                <Link to="/signup">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-smooth glow-primary text-lg px-8 rounded-full h-14"
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="glass hover:glass-strong transition-smooth text-lg px-8 rounded-full h-14 border-primary/30 hover:border-primary/60"
                  >
                    <Play className="mr-2 h-4 w-4 text-primary" />
                    Watch Demo
                  </Button>
                </Link>
              </motion.div>
            </motion.div>

            {/* Right — Hero Image */}
            <motion.div
              style={{ y: heroImageY, opacity: heroOpacity }}
              className="relative flex items-center justify-center"
            >
              {/* Glow behind image */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[80%] h-[80%] rounded-full bg-primary/15 blur-[80px]" />
              </div>

              <motion.img
                src="/images/hero-bullseye.png"
                alt="Bullseye AI-Powered Trading Visualization"
                className="relative z-10 w-full max-w-[560px] lg:max-w-none lg:w-full h-auto rounded-3xl drop-shadow-2xl"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
              />

              {/* Floating data cards */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-4 -right-4 lg:top-4 lg:right-0 glass rounded-2xl px-4 py-3 border border-primary/20 glow-primary z-20"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">+12.4%</span>
                </div>
                <span className="text-xs text-muted-foreground">Portfolio Growth</span>
              </motion.div>

              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.5,
                }}
                className="absolute -bottom-2 -left-4 lg:bottom-8 lg:left-0 glass rounded-2xl px-4 py-3 border border-accent/20 z-20"
              >
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-accent" />
                  <span className="text-sm font-semibold text-foreground">AI Signal</span>
                </div>
                <span className="text-xs text-primary">Strong Buy — 94% Confidence</span>
              </motion.div>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="flex justify-center mt-16"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="flex flex-col items-center gap-2 text-muted-foreground/50"
            >
              <span className="text-xs uppercase tracking-widest">Scroll</span>
              <ChevronDown className="h-4 w-4" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════ SOCIAL PROOF BAR ═══════════════════ */}
      <section className="py-12 px-4 border-y border-border/30">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={itemVariants}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-extrabold gradient-text mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground uppercase tracking-wider font-medium">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════ FEATURES ═══════════════════ */}
      <section id="features" className="py-24 px-4">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-primary/10 mb-6">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Platform Features
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-5 tracking-tight">
              Everything You Need to{' '}
              <span className="gradient-text">Trade Smarter</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Our platform combines cutting-edge AI with real-time data to give you
              the competitive edge in today&apos;s markets.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                whileHover={{ scale: 1.03, y: -4 }}
                className="glass rounded-2xl p-7 hover:glass-strong transition-smooth border border-border/50 hover:border-primary/30 group cursor-pointer relative overflow-hidden"
              >
                {/* Hover glow overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-smooth rounded-2xl" />

                <div className="relative z-10">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-5 group-hover:glow-primary transition-smooth">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2.5 text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
      <section className="py-24 px-4 relative">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-primary/10 mb-6">
              <Globe className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                How It Works
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-5 tracking-tight">
              Three Steps to{' '}
              <span className="gradient-text">Smarter Trading</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Get started in minutes. Our platform handles the complexity so you can
              focus on what matters — making profitable decisions.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 relative"
          >
            {/* Connecting line */}
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-[2px] bg-gradient-to-r from-primary/40 via-primary/20 to-primary/40" />

            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                variants={itemVariants}
                className="relative text-center"
              >
                {/* Step number */}
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground text-xl font-bold mb-6 mx-auto glow-primary relative z-10">
                  <step.icon className="h-7 w-7" />
                </div>

                <div className="text-xs font-bold text-primary/60 uppercase tracking-[0.2em] mb-2">
                  Step {step.step}
                </div>
                <h3 className="text-2xl font-bold mb-3 text-foreground">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════ TRUST BADGES ═══════════════════ */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="glass rounded-3xl p-8 md:p-12 border border-border/30"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              <motion.div variants={itemVariants} className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Bank-Grade Security</h4>
                  <p className="text-sm text-muted-foreground">256-bit AES encryption</p>
                </div>
              </motion.div>
              <motion.div variants={itemVariants} className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Real-Time Processing</h4>
                  <p className="text-sm text-muted-foreground">Sub-second latency</p>
                </div>
              </motion.div>
              <motion.div variants={itemVariants} className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Global Markets</h4>
                  <p className="text-sm text-muted-foreground">NSE, BSE & crypto coverage</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════ CTA ═══════════════════ */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass-strong rounded-3xl p-12 md:p-16 text-center relative overflow-hidden"
          >
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10" />

            {/* Animated glow */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.15, 0.3],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/20 blur-[100px] pointer-events-none"
            />

            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 tracking-tight">
                Ready to{' '}
                <span className="gradient-text">Transform</span>
                <br className="hidden sm:block" />
                {' '}Your Trading?
              </h2>
              <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                Join thousands of traders using AI to make smarter investment
                decisions. Start your journey today — it&apos;s free.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link to="/signup">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-smooth glow-primary text-lg px-12 rounded-full h-14"
                  >
                    Get Started Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button
                    size="lg"
                    variant="ghost"
                    className="text-lg px-8 text-muted-foreground hover:text-foreground transition-smooth"
                  >
                    Already have an account?
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="py-12 px-4 border-t border-border/30">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <img src="/favicon.ico" alt="Bullseye" className="h-8 w-8" />
              <span className="text-lg font-bold gradient-text">Bullseye</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link
                to="/login"
                className="hover:text-foreground transition-smooth"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="hover:text-foreground transition-smooth"
              >
                Get Started
              </Link>
              <a
                href="#features"
                className="hover:text-foreground transition-smooth"
              >
                Features
              </a>
            </div>
            <p className="text-sm text-muted-foreground/60">
              © {new Date().getFullYear()} Bullseye. AI-Powered Investment Platform.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
