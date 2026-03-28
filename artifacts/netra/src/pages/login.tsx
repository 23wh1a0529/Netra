import React, { useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Shield, Lock, Phone, User, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSendOtp, useVerifyOtp, useAdminLogin } from "@workspace/api-client-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

export function LoginPage() {
  const [, setLocation] = useLocation();
  const { login, guestAdminLogin } = useAuth();
  const [tab, setTab] = useState<"officer" | "admin">("officer");
  const [isShaking, setIsShaking] = useState(false);

  // Officer State
  const [mobile, setMobile] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Admin State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const sendOtpReq = useSendOtp();
  const verifyOtpReq = useVerifyOtp();
  const adminLoginReq = useAdminLogin();

  const shake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleSendOtp = () => {
    if (mobile.length !== 10) {
      toast.error("Enter a valid 10-digit mobile number");
      shake();
      return;
    }
    sendOtpReq.mutate({ data: { mobile } }, {
      onSuccess: (data) => {
        setOtpSent(true);
        toast.success(`OTP Sent! (Demo OTP: ${data.otp})`, { duration: 5000 });
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      },
      onError: () => shake()
    });
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    
    if (newOtp.every(v => v !== "")) {
      // Auto submit
      verifyOtpReq.mutate({ data: { mobile, otp: newOtp.join("") } }, {
        onSuccess: (data) => {
          login(data);
          toast.success("Login successful");
          setLocation("/officer");
        },
        onError: () => {
          toast.error("Invalid OTP");
          shake();
        }
      });
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    adminLoginReq.mutate({ data: { username, password } }, {
      onSuccess: (data) => {
        login(data);
        setLocation("/admin");
      },
      onError: () => {
        toast.error("Invalid credentials");
        shake();
      }
    });
  };

  const handleGuestAdmin = () => {
    guestAdminLogin();
    setLocation("/admin");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[420px]"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">నేత్ర NETRA</h1>
          <p className="text-muted-foreground mt-2">Smart Bandobusth Duty Monitor</p>
        </div>

        <motion.div 
          animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden"
        >
          {/* Tabs */}
          <div className="flex p-2 bg-secondary/50 border-b border-border">
            <button 
              onClick={() => setTab("officer")}
              className={cn("flex-1 py-2.5 text-sm font-bold rounded-xl transition-all", tab === "officer" ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              Officer Login
            </button>
            <button 
              onClick={() => setTab("admin")}
              className={cn("flex-1 py-2.5 text-sm font-bold rounded-xl transition-all", tab === "admin" ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              Admin Login
            </button>
          </div>

          <div className="p-6 md:p-8">
            {tab === "officer" ? (
              <div className="space-y-6">
                {!otpSent ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Mobile Number</label>
                      <div className="flex bg-background border-2 border-border rounded-xl overflow-hidden focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                        <div className="bg-secondary px-4 py-3 flex items-center justify-center border-r border-border font-mono font-bold text-muted-foreground">
                          +91
                        </div>
                        <input 
                          type="tel" 
                          maxLength={10}
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          className="flex-1 px-4 py-3 bg-transparent outline-none font-mono font-bold tracking-widest"
                          placeholder="9876543210"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={handleSendOtp}
                      disabled={sendOtpReq.isPending || mobile.length !== 10}
                      className="w-full py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {sendOtpReq.isPending ? "Sending..." : "Send OTP"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">OTP sent to +91 {mobile}</p>
                      <button onClick={() => setOtpSent(false)} className="text-xs text-primary font-bold mt-1 hover:underline">Change Number</button>
                    </div>
                    <div className="flex justify-between gap-2">
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          ref={el => otpRefs.current[i] = el}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !digit && i > 0) {
                              otpRefs.current[i - 1]?.focus();
                            }
                          }}
                          className="w-12 h-14 text-center text-xl font-mono font-bold bg-background border-2 border-border rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                        />
                      ))}
                    </div>
                    <button 
                      onClick={() => verifyOtpReq.mutate({ data: { mobile, otp: otp.join("") } })}
                      disabled={verifyOtpReq.isPending || otp.join("").length !== 6}
                      className="w-full py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                    >
                      Verify & Enter
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleAdminLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Username</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input 
                      type="text" 
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-background border-2 border-border rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium"
                      placeholder="admin"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-11 pr-12 py-3 bg-background border-2 border-border rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium"
                      placeholder="••••••••"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={adminLoginReq.isPending || !username || !password}
                  className="w-full py-3.5 mt-2 bg-foreground hover:bg-foreground/90 text-background font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50"
                >
                  {adminLoginReq.isPending ? "Authenticating..." : "Login to Console"}
                </button>
              </form>
            )}
          </div>
        </motion.div>

        <div className="mt-8 text-center">
          <button 
            onClick={handleGuestAdmin}
            className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors underline underline-offset-4 decoration-muted hover:decoration-primary"
          >
            Bypass & Enter as Guest Admin
          </button>
        </div>
      </motion.div>
    </div>
  );
}
