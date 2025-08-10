'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [showActivationCode, setShowActivationCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activationLoading, setActivationLoading] = useState(false);
  const [activationStep, setActivationStep] = useState('');
  const [error, setError] = useState('');
  const [activationCompleted, setActivationCompleted] = useState(false);
  const { signIn, signUp, refreshUserProfile, setUserProfile } = useAuth();
  const router = useRouter();

     // Clean up activation loading state if user navigates away
   useEffect(() => {
     const handleRouteChange = () => {
       if (activationLoading) {
         setActivationLoading(false);
         setActivationStep('');
         localStorage.removeItem('activationInProgress');
       }
     };

     // Listen for route changes
     window.addEventListener('beforeunload', handleRouteChange);
     
     // Set a timeout to clean up if navigation doesn't happen within 30 seconds
     const timeoutId = setTimeout(() => {
       if (activationLoading) {
         setActivationLoading(false);
         setActivationStep('');
         localStorage.removeItem('activationInProgress');
       }
     }, 30000);
     
     return () => {
       window.removeEventListener('beforeunload', handleRouteChange);
       clearTimeout(timeoutId);
     };
   }, [activationLoading]);

     const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     setLoading(true);
     setError('');

     try {
       if (isSignUp) {
         if (!tenantName.trim()) {
           setError('Business name is required');
           setLoading(false);
           return;
         }

         // Validate password requirements
         if (password.length < 8) {
           setError('Password must be at least 8 characters long');
           setLoading(false);
           return;
         }

         if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
           setError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
           setLoading(false);
           return;
         }

         if (password !== confirmPassword) {
           setError('Passwords do not match');
           setLoading(false);
           return;
         }

         // If activation code is provided, use the activation flow
         if (activationCode.trim()) {
           setActivationLoading(true);
           setActivationStep('Creating user account...');
           
           // Set a flag to indicate activation is in progress
           localStorage.setItem('activationInProgress', 'true');
           
                       // Don't set a placeholder profile - let the activation process complete properly
           
           // Create user account first (without tenant setup)
           if (!auth) {
             throw new Error('Firebase auth not initialized');
           }
           
           const userCredential = await createUserWithEmailAndPassword(auth, email, password);
           
           // Get auth token
           const token = await userCredential.user.getIdToken();
           
           // Step 1: Verify activation code
           setActivationStep('Verifying activation code...');
           const step1Response = await fetch('/api/activation/validate', {
             method: 'POST',
             headers: {
               'Authorization': `Bearer ${token}`,
               'Content-Type': 'application/json',
             },
             body: JSON.stringify({ 
               code: activationCode.trim(),
               tenantName: tenantName.trim(),
               step: 'verify-code'
             }),
           });

           if (!step1Response.ok) {
             const errorData = await step1Response.json();
             throw new Error(errorData.error || 'Failed to verify activation code');
           }

                       await step1Response.json();
           
           // Step 2: Create tenant
           setActivationStep('Creating business profile...');
           const step2Response = await fetch('/api/activation/validate', {
             method: 'POST',
             headers: {
               'Authorization': `Bearer ${token}`,
               'Content-Type': 'application/json',
             },
             body: JSON.stringify({ 
               code: activationCode.trim(),
               tenantName: tenantName.trim(),
               step: 'create-tenant'
             }),
           });

           if (!step2Response.ok) {
             const errorData = await step2Response.json();
             throw new Error(errorData.error || 'Failed to create tenant');
           }

           const step2Result = await step2Response.json();
           
           // Step 3: Apply activation code
           setActivationStep('Applying activation code...');
           const step3Response = await fetch('/api/activation/validate', {
             method: 'POST',
             headers: {
               'Authorization': `Bearer ${token}`,
               'Content-Type': 'application/json',
             },
             body: JSON.stringify({ 
               code: activationCode.trim(),
               tenantName: tenantName.trim(),
               step: 'apply-activation',
               tenantId: step2Result.tenantId
             }),
           });

           if (!step3Response.ok) {
             const errorData = await step3Response.json();
             throw new Error(errorData.error || 'Failed to apply activation code');
           }

                       await step3Response.json();
           
           // Step 4: Verify completion
           setActivationStep('Finalizing setup...');
           const step4Response = await fetch('/api/activation/validate', {
             method: 'POST',
             headers: {
               'Authorization': `Bearer ${token}`,
               'Content-Type': 'application/json',
             },
             body: JSON.stringify({ 
               code: activationCode.trim(),
               tenantName: tenantName.trim(),
               step: 'verify-completion',
               tenantId: step2Result.tenantId
             }),
           });

           if (!step4Response.ok) {
             const errorData = await step4Response.json();
             throw new Error(errorData.error || 'Failed to verify completion');
           }

           const step4Result = await step4Response.json();
           
                       if (step4Result.success && step4Result.profileReady) {
              setActivationStep('Redirecting to dashboard...');
              
              // Ensure the profile is set before redirecting
              await refreshUserProfile();
              
              // Mark activation as completed to prevent finally block from resetting loading state
              setActivationCompleted(true);
              
              // Navigate to dashboard - the loading screen will persist until the page actually changes
              localStorage.removeItem('activationInProgress');
              router.push('/dashboard');
              
              // Return early to prevent the finally block from running
              return;
            } else {
              throw new Error('Final verification failed');
            }
                   } else {
            // Normal signup without activation code
            await signUp(email, password, tenantName);
            
            // Ensure the profile is set before redirecting
            await refreshUserProfile();
            
            router.push('/dashboard');
          }
                       } else {
          // Set a flag to indicate this is a fresh sign-in
          localStorage.setItem('freshSignIn', 'true');
          
          await signIn(email, password);
          
          // Clear the fresh sign-in flag and trigger profile fetch
          localStorage.removeItem('freshSignIn');
          
          // Trigger a profile fetch now that sign-in is complete
          const token = await auth.currentUser?.getIdToken();
          if (token) {
            const response = await fetch('/api/auth/profile', {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            
            if (response.ok) {
              const profile = await response.json();
              // Update the profile in the auth context
              setUserProfile(profile);
              
              // Now that profile is set, we can set loading to false
              setLoading(false);
            } else {
              setLoading(false);
            }
          } else {
            setLoading(false);
          }
          
          router.push('/dashboard');
        }
           } catch (error: any) {
        setError(error.message || 'An error occurred');
        setActivationLoading(false);
        setActivationStep('');
        setActivationCompleted(false);
        localStorage.removeItem('activationInProgress');
        setLoading(false);
      } finally {
        // Only reset loading states if there was an error or activation didn't complete successfully
        if (!activationLoading || activationCompleted) {
          if (activationCompleted) {
            // Activation completed successfully - keeping loading state for navigation
          } else {
            setLoading(false);
          }
        } else {
          // Keeping activation loading state active for navigation
        }
      }
   };

     // Show activation loading screen
   if (activationLoading) {
     return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto"></div>
          <h2 className="text-2xl font-bold text-gray-900">Setting Up Your Account</h2>
          <p className="text-gray-600">Please wait while we activate your account and set up your business profile...</p>
          <div className="space-y-2 text-sm text-gray-500">
            <div className={activationStep.includes('Creating user account') ? 'text-primary-600 font-medium' : 'text-gray-400'}>
              {activationStep.includes('Creating user account') ? '🔄' : '✓'} Creating user account
            </div>
            <div className={activationStep.includes('Verifying activation code') ? 'text-primary-600 font-medium' : 'text-gray-400'}>
              {activationStep.includes('Verifying activation code') ? '🔄' : '✓'} Verifying activation code
            </div>
            <div className={activationStep.includes('Creating business profile') ? 'text-primary-600 font-medium' : 'text-gray-400'}>
              {activationStep.includes('Creating business profile') ? '🔄' : '✓'} Creating business profile
            </div>
            <div className={activationStep.includes('Applying activation code') ? 'text-primary-600 font-medium' : 'text-gray-400'}>
              {activationStep.includes('Applying activation code') ? '🔄' : '✓'} Applying activation code
            </div>
            <div className={activationStep.includes('Finalizing setup') ? 'text-primary-600 font-medium' : 'text-gray-400'}>
              {activationStep.includes('Finalizing setup') ? '🔄' : '✓'} Finalizing setup
            </div>
            <div className={activationStep.includes('Configuring permanent access') ? 'text-primary-600 font-medium' : 'text-gray-400'}>
              {activationStep.includes('Configuring permanent access') ? '🔄' : '✓'} Configuring permanent access
            </div>
            <div className={activationStep.includes('Redirecting to dashboard') ? 'text-primary-600 font-medium' : 'text-gray-400'}>
              {activationStep.includes('Redirecting to dashboard') ? '🔄' : '✓'} Redirecting to dashboard
            </div>
          </div>
          {activationStep && (
            <div className="text-sm text-primary-600 font-medium">
              Current: {activationStep}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isSignUp ? 'Create Your Account' : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isSignUp ? 'Set up your business customer directory' : 'Access your customer directory'}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {isSignUp && (
              <div>
                <label htmlFor="tenantName" className="block text-sm font-medium text-gray-700">
                  Business Name *
                </label>
                <input
                  id="tenantName"
                  name="tenantName"
                  type="text"
                  required={isSignUp}
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="input-field"
                  placeholder="Enter your business name"
                />
              </div>
            )}

            {isSignUp && (
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="activationCode" className="block text-sm font-medium text-gray-700">
                    Activation Code (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowActivationCode(!showActivationCode)}
                    className="text-sm text-primary-600 hover:text-primary-500"
                  >
                    {showActivationCode ? 'Hide' : 'Have a code?'}
                  </button>
                </div>
                {showActivationCode && (
                  <input
                    id="activationCode"
                    name="activationCode"
                    type="text"
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value)}
                    className="input-field"
                    placeholder="Enter activation code for permanent access"
                  />
                )}
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="Enter your email"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter your password"
              />
              {isSignUp && (
                <div className="mt-1 text-xs text-gray-500">
                  Must be at least 8 characters with uppercase, lowercase, and number
                </div>
              )}
            </div>

            {isSignUp && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                  placeholder="Confirm your password"
                />
              </div>
            )}
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isSignUp ? 'Creating Account...' : 'Signing In...'}
                </div>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setTenantName('');
                setPassword('');
                setConfirmPassword('');
                setActivationCode('');
                setShowActivationCode(false);
              }}
              className="text-primary-600 hover:text-primary-500 text-sm"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>

        {isSignUp && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Free Trial Includes:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Up to 100 customers</li>
              <li>• CSV import functionality</li>
              <li>• Custom fields support</li>
              <li>• Advanced search and filtering</li>
              <li>• 30-day free trial</li>
            </ul>
            {showActivationCode && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <h4 className="text-sm font-medium text-blue-900 mb-1">Activation Code Benefits:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Permanent access (no renewal required)</li>
                  <li>• Higher plan features (Pro/Enterprise)</li>
                  <li>• Unlimited customers (Enterprise)</li>
                  <li>• Priority support</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
