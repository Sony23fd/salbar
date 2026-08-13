import React, { useState } from 'react';
import { Building2, KeyRound, Mail, AlertCircle, ArrowRight, ShieldCheck, Box, BarChart3 } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../lib/api';

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const data = await api.login(email, password);
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'И-мэйл эсвэл нууц үг буруу байна.');
    } finally {
      setIsLoading(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row selection:bg-blue-600 selection:text-white font-sans">
      
      {/* LEFT SIDE - BRANDING (Split Screen) */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 bg-slate-900 relative overflow-hidden flex-col justify-between p-12 lg:p-20">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-600/20 blur-[120px]" />
        </div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>

        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10"
        >
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/50">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">NOMAD PREMIUM FOODS</span>
          </div>

          <div className="max-w-xl">
            <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight mb-6">
              Үйлдвэрлэл, Агуулахын <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Ухаалаг Удирдлага</span>
            </h1>
            <p className="text-lg text-slate-400 font-medium leading-relaxed mb-10 max-w-md">
              Түүхий эдээс бэлэн бүтээгдэхүүн хүртэлх бүхий л үйл явцыг нэг дороос удирдах цогц систем.
            </p>

            <div className="space-y-6">
              {[
                { icon: ShieldCheck, title: 'Найдвартай ажиллагаа', desc: 'Өгөгдлийн өндөр нууцлал ба аюулгүй байдал' },
                { icon: Box, title: 'Үлдэгдлийн хяналт', desc: 'Агуулахын бодит цагийн мэдээлэл ба удирдлага' },
                { icon: BarChart3, title: 'Нарийвчилсан тайлан', desc: 'Үйлдвэрлэл, санхүүгийн цогц тайлангууд' },
              ].map((feature, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + (idx * 0.15) }}
                  className="flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                    <feature.icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-slate-200 font-bold text-sm">{feature.title}</h3>
                    <p className="text-slate-500 text-xs mt-1">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="relative z-10 text-xs text-slate-500 font-medium"
        >
          &copy; {new Date().getFullYear()} Nomad Premium Foods LLC. Бүх эрх хуулиар хамгаалагдсан.
        </motion.div>
      </div>

      {/* RIGHT SIDE - FORM */}
      <div className="w-full md:w-1/2 lg:w-2/5 flex items-center justify-center p-6 sm:p-12 relative bg-white">
        
        {/* Mobile Logo */}
        <div className="md:hidden absolute top-8 left-6 flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-slate-900 tracking-tight">NOMAD FOODS</span>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-sm"
        >
          <motion.div variants={itemVariants} className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Тавтай морил 👋</h2>
            <p className="text-sm text-slate-500 mt-2 font-medium">Систем рүү нэвтрэх мэдээллээ оруулна уу.</p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 text-red-700 p-4 rounded-2xl text-sm font-medium border border-red-200 flex items-start gap-3 shadow-sm"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                <span>{error}</span>
              </motion.div>
            )}

            <motion.div variants={itemVariants}>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                И-мэйл хаяг
              </label>
              <div className="relative group">
                <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-3.5 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-medium shadow-sm hover:border-slate-300"
                  required
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                Нууц үг
              </label>
              <div className="relative group">
                <KeyRound className="w-5 h-5 text-slate-400 absolute left-4 top-3.5 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-medium shadow-sm hover:border-slate-300"
                  required
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="pt-4">
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-4 rounded-2xl transition-colors shadow-lg shadow-slate-900/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Нэвтэрч байна...</span>
                  </div>
                ) : (
                  <>
                    <span>Нэвтрэх</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </motion.button>
            </motion.div>
          </form>

        </motion.div>
      </div>
    </div>
  );
};
