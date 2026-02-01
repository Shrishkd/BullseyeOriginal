import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  DollarSign,
  Target,
  Activity,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

// Mock data
const marketData = [
  { name: 'BTC', price: '₹42,150', change: '+2.5%', isUp: true },
  { name: 'ETH', price: '₹2,280', change: '+1.8%', isUp: true },
  { name: 'RELIANCE', price: '₹2,478.25', change: '-0.5%', isUp: false },
  { name: 'TCS', price: '₹3,245.80', change: '+3.2%', isUp: true },
];

const predictionsData = [
  { time: '9AM', actual: 100, predicted: 102 },
  { time: '10AM', actual: 105, predicted: 107 },
  { time: '11AM', actual: 110, predicted: 108 },
  { time: '12PM', actual: 115, predicted: 116 },
  { time: '1PM', actual: 118, predicted: 120 },
  { time: '2PM', actual: 122, predicted: 121 },
];

const portfolioData = [
  { name: 'Stocks', value: 45, color: 'hsl(190, 95%, 45%)' },
  { name: 'Crypto', value: 30, color: 'hsl(270, 70%, 60%)' },
  { name: 'Bonds', value: 15, color: 'hsl(160, 85%, 45%)' },
  { name: 'Cash', value: 10, color: 'hsl(220, 20%, 40%)' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-2">
          Welcome to <span className="gradient-text">Bullseye</span>
        </h1>
        <p className="text-muted-foreground">
          Your AI-powered investment dashboard with real-time insights
        </p>
      </motion.div>

      {/* Stats Overview */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={itemVariants}>
          <Card className="glass p-6 border-border/50 hover:glass-strong transition-smooth">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Portfolio</p>
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">₹1,25,420</p>
            <p className="text-sm text-accent flex items-center gap-1 mt-1">
              <ArrowUp className="h-3 w-3" />
              +12.5% this month
            </p>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="glass p-6 border-border/50 hover:glass-strong transition-smooth">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Returns</p>
              <TrendingUp className="h-4 w-4 text-accent" />
            </div>
            <p className="text-2xl font-bold">₹25,420</p>
            <p className="text-sm text-accent flex items-center gap-1 mt-1">
              <ArrowUp className="h-3 w-3" />
              +25.4% ROI
            </p>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="glass p-6 border-border/50 hover:glass-strong transition-smooth">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Risk Score</p>
              <Activity className="h-4 w-4 text-secondary" />
            </div>
            <p className="text-2xl font-bold">Moderate</p>
            <p className="text-sm text-muted-foreground mt-1">Sharpe Ratio: 1.42</p>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="glass p-6 border-border/50 hover:glass-strong transition-smooth">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Active Alerts</p>
              <Target className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">8</p>
            <p className="text-sm text-muted-foreground mt-1">3 new today</p>
          </Card>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-Time Market Data */}
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <Card className="glass p-6 border-border/50">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Real-Time Market Data
            </h2>
            <div className="space-y-3">
              {marketData.map((asset, index) => (
                <motion.div
                  key={asset.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-smooth"
                >
                  <div>
                    <p className="font-semibold">{asset.name}</p>
                    <p className="text-2xl font-bold">{asset.price}</p>
                  </div>
                  <div
                    className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                      asset.isUp
                        ? 'bg-accent/20 text-accent'
                        : 'bg-destructive/20 text-destructive'
                    }`}
                  >
                    {asset.isUp ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )}
                    <span className="font-semibold">{asset.change}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* AI Predictions */}
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <Card className="glass p-6 border-border/50">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-secondary" />
              AI Price Predictions
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={predictionsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="hsl(190, 95%, 45%)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="hsl(270, 70%, 60%)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary"></div>
                <span className="text-sm text-muted-foreground">Actual</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-secondary"></div>
                <span className="text-sm text-muted-foreground">Predicted</span>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Portfolio & Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Allocation */}
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <Card className="glass p-6 border-border/50">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-accent" />
              Portfolio Allocation
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={portfolioData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {portfolioData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {portfolioData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm text-muted-foreground">
                    {item.name} ({item.value}%)
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Risk Analysis */}
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <Card className="glass p-6 border-border/50">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-destructive" />
              Risk Analysis
            </h2>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Volatility</span>
                  <span className="text-sm font-semibold">18.5%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '75%' }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="h-full bg-gradient-to-r from-accent to-primary"
                  ></motion.div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Sharpe Ratio</span>
                  <span className="text-sm font-semibold">1.42</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '60%' }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-gradient-to-r from-primary to-secondary"
                  ></motion.div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">VaR (95%)</span>
                  <span className="text-sm font-semibold">₹2,450</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '40%' }}
                    transition={{ duration: 1, delay: 0.7 }}
                    className="h-full bg-gradient-to-r from-secondary to-destructive"
                  ></motion.div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/50">
                <div className="flex items-center justify-between p-3 rounded-lg bg-accent/10">
                  <span className="font-semibold">Risk Classification</span>
                  <span className="px-3 py-1 rounded-full bg-accent/20 text-accent font-semibold">
                    Moderate
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
