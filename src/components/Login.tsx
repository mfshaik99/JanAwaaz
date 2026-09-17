import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function Login() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) return toast.error('Please enter your email address first');
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent!');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      let role = 'citizen';
      const isAdmin = ['mfshaik99@gmail.com', 'chirudeepartham@gmail.com', 'maazeem206@gmail.com'].includes(user.email || '');

      if (!docSnap.exists()) {
        role = isAdmin ? 'admin' : 'citizen';
        await setDoc(docRef, {
          name: user.displayName || 'Google User',
          email: user.email,
          role,
          createdAt: new Date().toISOString()
        });
      } else {
        role = docSnap.data().role;
      }

      toast.success('Successfully authenticated with Google');
      navigate(role === 'admin' ? '/dashboard' : '/');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('All fields are required');
    setLoading(true);
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      toast.success('Logged in successfully');
      
      const { getDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      const docSnap = await getDoc(doc(db, 'users', userCred.user.uid));
      
      if (docSnap.exists() && docSnap.data().role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    } catch (error: any) {
      toast.error('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible'
      });
    }
  };

  const handleSendOtp = async () => {
    if (!phone) return toast.error('Phone is required');
    setLoading(true);
    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      toast.success('OTP sent');
    } catch (error: any) {
      toast.error(error.message);
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.render().then((widgetId: any) => {
          (window as any).grecaptcha.reset(widgetId);
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return toast.error('OTP is required');
    setLoading(true);
    try {
      const result = await confirmationResult.confirm(otp);
      const docRef = doc(db, 'users', result.user.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await setDoc(docRef, {
          name: 'Citizen',
          phone: result.user.phoneNumber,
          role: 'citizen',
          createdAt: new Date().toISOString()
        });
      }
      toast.success('Logged in successfully');
      navigate('/');
    } catch (error: any) {
      toast.error('Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-slate-50">
      <div className="bg-white p-8 rounded-3xl google-shadow-sm border border-slate-200 w-full max-w-md">
        <h2 className="text-3xl font-bold text-slate-900 mb-6 text-center tracking-tight">Log In to JanAwaaz</h2>
        
        <div className="flex gap-2 mb-6 bg-slate-100 p-1.5 rounded-xl">
          <button
            onClick={() => setMethod('email')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg google-transition-fast ${method === 'email' ? 'bg-white text-blue-600 google-shadow-sm' : 'text-slate-500'}`}
          >
            Email
          </button>
          <button
            onClick={() => setMethod('phone')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg google-transition-fast ${method === 'phone' ? 'bg-white text-blue-600 google-shadow-sm' : 'text-slate-500'}`}
          >
            Phone
          </button>
        </div>

        {method === 'email' ? (
          <form onSubmit={handleEmailLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-widest">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-5 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none google-transition bg-slate-50 focus:bg-white" required />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest">Password</label>
                <button type="button" onClick={handleForgotPassword} className="text-xs text-blue-600 font-bold hover:underline">
                  Forgot Password?
                </button>
              </div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-5 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none google-transition bg-slate-50 focus:bg-white" required />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3.5 rounded-full font-bold hover:bg-blue-700 active:scale-[0.98] google-transition-fast flex items-center justify-center mt-2 google-shadow-sm">
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Log In'}
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            <div id="recaptcha-container"></div>
            {!confirmationResult ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-widest">Phone Number (with code)</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91..." className="w-full px-5 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none google-transition bg-slate-50 focus:bg-white" />
                </div>
                <button onClick={handleSendOtp} disabled={loading} className="w-full bg-blue-600 text-white py-3.5 rounded-full font-bold hover:bg-blue-700 active:scale-[0.98] google-transition-fast flex items-center justify-center google-shadow-sm">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : 'Send OTP'}
                </button>
              </>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-widest">Enter OTP</label>
                  <input type="text" value={otp} onChange={e => setOtp(e.target.value)} className="w-full px-5 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none google-transition bg-slate-50 focus:bg-white" required />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3.5 rounded-full font-bold hover:bg-blue-700 active:scale-[0.98] google-transition-fast flex items-center justify-center google-shadow-sm">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : 'Verify & Log In'}
                </button>
              </form>
            )}
          </div>
        )}

        <div className="relative mt-8 mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
            <span className="px-3 bg-white text-slate-400">Or continue with</span>
          </div>
        </div>

        <button 
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-slate-200 rounded-full text-slate-700 font-bold hover:bg-slate-50 active:scale-[0.98] google-transition-fast google-shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>

        <p className="mt-6 text-center text-sm text-slate-600">
          Don't have an account? <Link to="/register" className="text-blue-600 font-medium hover:underline">Create Account</Link>
        </p>
      </div>
    </div>
  );
}
