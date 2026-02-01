import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { chatQuery } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const quickPrompts = [
  'Analyze TCS stock',
  'Summarize market trends',
  'Explain portfolio volatility',
  'Bitcoin price prediction',
];

export default function Chat() {
  const { isAuthenticated } = useAuthStore();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      role: 'assistant',
      content:
        "Hello! I'm your AI investment assistant. I can help you analyze stocks, understand market trends, review your portfolio, and answer investment questions. How can I help you today?",
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    if (!isAuthenticated) {
      toast.error('Please login to use the AI assistant');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await chatQuery(userMessage.content);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.answer || 'No response generated.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content:
            error?.message ||
            'Something went wrong while contacting the AI service.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold mb-2">
          AI Chat <span className="gradient-text">Assistant</span>
        </h1>
        <p className="text-muted-foreground">
          Get instant insights and answers to your investment questions
        </p>
      </motion.div>

      {/* Quick Prompts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-4 flex flex-wrap gap-2"
      >
        {quickPrompts.map((prompt, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => handleQuickPrompt(prompt)}
            className="glass hover:glass-strong transition-smooth border-border/50 hover:border-primary/30"
          >
            <img src="/favicon.ico" alt="Bullseye" className="h-3 w-3 mr-2" />
            {prompt}
          </Button>
        ))}
      </motion.div>

      {/* Messages Container */}
      <Card className="flex-1 glass border-border/50 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary glow-primary flex items-center justify-center flex-shrink-0">
                    <Bot className="h-5 w-5 text-primary-foreground" />
                  </div>
                )}

                <div
                  className={`max-w-[70%] rounded-2xl p-4 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-primary to-secondary text-primary-foreground'
                      : 'glass-strong'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                  <p
                    className={`text-xs mt-2 ${
                      message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>

                {message.role === 'user' && (
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-foreground" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary glow-primary flex items-center justify-center flex-shrink-0">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="glass-strong rounded-2xl p-4">
                <div className="flex gap-1">
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="h-2 w-2 rounded-full bg-primary"
                  />
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                    className="h-2 w-2 rounded-full bg-primary"
                  />
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                    className="h-2 w-2 rounded-full bg-primary"
                  />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border/50 glass-strong">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about stocks, market trends, portfolio analysis..."
              className="min-h-[60px] max-h-[120px] bg-background/50 border-border/50 focus:border-primary transition-smooth resize-none"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-smooth glow-primary px-6"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </Card>
    </div>
  );
}
