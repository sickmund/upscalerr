import React, { useState, useEffect } from 'react';
import { Check, Smartphone, CreditCard, Loader2, X } from 'lucide-react';

interface MockPaymentModalProps {
  onComplete: () => void;
  onClose: () => void;
  amount: string;
  item: string;
}

export const MockPaymentModal: React.FC<MockPaymentModalProps> = ({ onComplete, onClose, amount, item }) => {
  const [status, setStatus] = useState<'confirm' | 'processing' | 'success'>('confirm');

  const handlePay = () => {
    setStatus('processing');
    // Simulate network request / FaceID
    setTimeout(() => {
      setStatus('success');
      // Simulate success message before closing
      setTimeout(() => {
        onComplete();
      }, 1500);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-md bg-[#1c1c1e] text-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 transform transition-all animate-in slide-in-from-bottom-10 duration-300">
        
        {/* Status: Success */}
        {status === 'success' && (
          <div className="absolute inset-0 z-20 bg-white flex flex-col items-center justify-center text-black animate-in fade-in duration-300">
            <div className="w-20 h-20 rounded-full border-4 border-emerald-500 flex items-center justify-center mb-4 animate-in zoom-in duration-300">
              <Check className="w-10 h-10 text-emerald-600" strokeWidth={3} />
            </div>
            <h2 className="text-2xl font-bold mb-1">Done</h2>
            <p className="text-gray-500 font-medium">Payment Successful</p>
          </div>
        )}

        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-start">
           <div className="flex gap-4">
             <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
               <Smartphone className="w-6 h-6 text-gray-400" />
             </div>
             <div>
               <h3 className="font-bold text-lg">VistaExpand Pro</h3>
               <p className="text-sm text-gray-400">{item}</p>
             </div>
           </div>
           <button onClick={onClose} className="bg-gray-800 p-1 rounded-full hover:bg-gray-700 transition-colors">
             <X className="w-4 h-4 text-gray-400" />
           </button>
        </div>

        {/* Details */}
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center py-2 border-b border-white/5">
             <span className="text-gray-400">Total</span>
             <span className="text-xl font-bold">{amount}</span>
          </div>
          
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
               <span className="text-sm text-gray-400">Card</span>
               <div className="flex items-center gap-2 text-sm">
                 <CreditCard className="w-4 h-4" />
                 <span className="font-mono">•••• 4242</span>
               </div>
            </div>
            <div className="flex justify-between items-center">
               <span className="text-sm text-gray-400">Contact</span>
               <span className="text-sm">user@example.com</span>
            </div>
          </div>
        </div>

        {/* Action Area */}
        <div className="p-6 pt-2 pb-8">
          <button
            onClick={handlePay}
            disabled={status !== 'confirm'}
            className="w-full h-14 bg-white text-black hover:bg-gray-100 active:scale-[0.98] rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all relative overflow-hidden"
          >
            {status === 'processing' ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <div className="bg-black text-white px-1.5 rounded text-[10px] font-serif font-bold tracking-tighter border border-black">Pay</div>
                Pay with Passcode
              </>
            )}
          </button>
          <div className="mt-6 flex justify-center">
             <div className="w-1/3 h-1 bg-gray-800 rounded-full"></div>
          </div>
        </div>

      </div>
    </div>
  );
};