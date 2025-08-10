'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Mail, X, Send } from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
  const { userProfile } = useAuth();
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    includeSystemInfo: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const systemInfo = formData.includeSystemInfo ? `
      
System Information:
- User: ${userProfile?.email || 'Unknown'}
- Organization: ${userProfile?.tenantName || 'Unknown'}
- Plan: ${userProfile?.plan || 'Unknown'}
- Role: ${userProfile?.role || 'Unknown'}
- Browser: ${navigator.userAgent}
- URL: ${window.location.href}
- Timestamp: ${new Date().toISOString()}` : '';

      const formDataToSend = new FormData();
      formDataToSend.append('name', userProfile?.email || 'Unknown User');
      formDataToSend.append('email', userProfile?.email || 'unknown@example.com');
      formDataToSend.append('subject', formData.subject);
      formDataToSend.append('message', `${formData.message}${systemInfo}`);
      formDataToSend.append('source', 'Smart Customer Directory Support');
      
      const response = await fetch('https://usebasin.com/f/e00bfacd0e73', {
        method: 'POST',
        body: formDataToSend,
      });

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => {
          onClose();
          setSubmitted(false);
          setFormData({ subject: '', message: '', includeSystemInfo: true });
        }, 3000);
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending support message:', error);
      alert('Failed to send support message. Please try again or contact support@automatehubstudio.com directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setFormData({ subject: '', message: '', includeSystemInfo: true });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Mail className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-2xl font-bold text-gray-900">Contact Support</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

                 {submitted ? (
           <div className="text-center py-8">
             <div className="bg-green-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
               <Send className="h-8 w-8 text-green-600" />
             </div>
             <h3 className="text-lg font-semibold text-gray-900 mb-2">Message Sent Successfully!</h3>
             <p className="text-gray-600">
               Your support message has been sent to support@automatehubstudio.com. We'll get back to you as soon as possible.
             </p>
           </div>
         ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject *
              </label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description of your issue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message *
              </label>
              <textarea
                required
                rows={6}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Please describe your issue or question in detail..."
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeSystemInfo"
                checked={formData.includeSystemInfo}
                onChange={(e) => setFormData({ ...formData, includeSystemInfo: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="includeSystemInfo" className="ml-2 text-sm text-gray-700">
                Include system information (recommended for faster support)
              </label>
            </div>

                         <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
               <p className="text-sm text-blue-800">
                 <strong>Note:</strong> Your message will be sent directly to{' '}
                 <span className="font-mono">support@automatehubstudio.com</span> via our secure form service.
               </p>
             </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.subject.trim() || !formData.message.trim()}
                className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Opening Email...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
