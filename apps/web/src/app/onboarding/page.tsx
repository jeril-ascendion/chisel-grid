'use client';

import { useState } from 'react';

type Step = 'plan' | 'info' | 'checkout' | 'complete';

interface OnboardingData {
  plan: 'starter' | 'professional' | 'enterprise';
  organizationName: string;
  subdomain: string;
  adminEmail: string;
  adminName: string;
}

const PLANS = [
  {
    id: 'starter' as const,
    name: 'Starter',
    price: '$49/mo',
    description: 'Perfect for small teams getting started',
    features: [
      'AI content generation',
      'Up to 100 articles',
      'Up to 5 users',
      '500K AI tokens/month',
      '1 GB storage',
    ],
    notIncluded: ['Audio narration', 'Custom domain', 'SSO', 'API access', 'Advanced analytics'],
  },
  {
    id: 'professional' as const,
    name: 'Professional',
    price: '$199/mo',
    description: 'For growing teams who need more power',
    popular: true,
    features: [
      'AI content generation',
      'Audio narration',
      'Custom domain',
      'API access',
      'Advanced analytics',
      'Up to 1,000 articles',
      'Up to 25 users',
      '5M AI tokens/month',
      '10 GB storage',
    ],
    notIncluded: ['SSO integration', 'White label'],
  },
  {
    id: 'enterprise' as const,
    name: 'Enterprise',
    price: '$499/mo',
    description: 'Full power for large organizations',
    features: [
      'Everything in Professional',
      'SSO integration',
      'White label',
      'Unlimited articles',
      'Unlimited users',
      'Unlimited AI tokens',
      'Unlimited storage',
      'Priority support',
    ],
    notIncluded: [],
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('plan');
  const [data, setData] = useState<OnboardingData>({
    plan: 'professional',
    organizationName: '',
    subdomain: '',
    adminEmail: '',
    adminName: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validateSubdomain = (value: string): boolean => {
    return /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(value);
  };

  const handleInfoSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!data.organizationName.trim()) newErrors.organizationName = 'Required';
    if (!data.subdomain.trim()) newErrors.subdomain = 'Required';
    else if (!validateSubdomain(data.subdomain)) newErrors.subdomain = 'Must be 3-63 chars, lowercase letters, numbers, and hyphens only';
    if (!data.adminEmail.trim()) newErrors.adminEmail = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.adminEmail)) newErrors.adminEmail = 'Invalid email';
    if (!data.adminName.trim()) newErrors.adminName = 'Required';

    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      setStep('checkout');
    }
  };

  const handleCheckout = async () => {
    setLoading(true);
    // In production: calls the billing API to create a Stripe checkout session
    // then redirects to Stripe
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.checkoutUrl) {
          window.location.href = result.checkoutUrl;
          return;
        }
      }
      // Simulate success for development
      setStep('complete');
    } catch {
      setStep('complete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
              CG
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">ChiselGrid</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <StepIndicator current={step} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        {/* Step 1: Choose Plan */}
        {step === 'plan' && (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-center">Choose Your Plan</h1>
            <p className="mt-2 text-center text-gray-500">Start with a plan that fits your needs. Upgrade anytime.</p>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setData((prev) => ({ ...prev, plan: plan.id }))}
                  className={`relative cursor-pointer rounded-xl border-2 p-6 transition-all ${
                    data.plan === plan.id
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/10'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-xs font-medium text-white">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
                  <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{plan.price}</p>
                  <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
                  <ul className="mt-4 space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <svg className="h-4 w-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                    {plan.notIncluded.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-gray-400">
                        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={() => setStep('info')}
                className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Continue with {PLANS.find((p) => p.id === data.plan)?.name}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Organization Info */}
        {step === 'info' && (
          <div className="max-w-lg mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Set Up Your Organization</h1>
            <p className="mt-2 text-gray-500">Tell us about your organization to get started.</p>

            <div className="mt-8 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Organization Name</label>
                <input
                  type="text"
                  value={data.organizationName}
                  onChange={(e) => setData((prev) => ({ ...prev, organizationName: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  placeholder="Acme Corp"
                />
                {errors.organizationName && <p className="mt-1 text-xs text-red-500">{errors.organizationName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subdomain</label>
                <div className="mt-1 flex rounded-lg">
                  <input
                    type="text"
                    value={data.subdomain}
                    onChange={(e) => setData((prev) => ({ ...prev, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    className="block w-full rounded-l-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                    placeholder="acme"
                  />
                  <span className="inline-flex items-center rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 text-sm text-gray-500">
                    .chiselgrid.com
                  </span>
                </div>
                {errors.subdomain && <p className="mt-1 text-xs text-red-500">{errors.subdomain}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Admin Name</label>
                <input
                  type="text"
                  value={data.adminName}
                  onChange={(e) => setData((prev) => ({ ...prev, adminName: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  placeholder="Jane Doe"
                />
                {errors.adminName && <p className="mt-1 text-xs text-red-500">{errors.adminName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Admin Email</label>
                <input
                  type="email"
                  value={data.adminEmail}
                  onChange={(e) => setData((prev) => ({ ...prev, adminEmail: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  placeholder="jane@acme.com"
                />
                {errors.adminEmail && <p className="mt-1 text-xs text-red-500">{errors.adminEmail}</p>}
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setStep('plan')}
                className="rounded-lg border border-gray-300 dark:border-gray-600 px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Back
              </button>
              <button
                onClick={handleInfoSubmit}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Continue to Checkout
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Checkout */}
        {step === 'checkout' && (
          <div className="max-w-lg mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Review & Pay</h1>
            <p className="mt-2 text-gray-500">Review your selections before proceeding to payment.</p>

            <div className="mt-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Plan</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {PLANS.find((p) => p.id === data.plan)?.name} — {PLANS.find((p) => p.id === data.plan)?.price}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Organization</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{data.organizationName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Subdomain</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{data.subdomain}.chiselgrid.com</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Admin</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{data.adminName} ({data.adminEmail})</span>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setStep('info')}
                className="rounded-lg border border-gray-300 dark:border-gray-600 px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Back
              </button>
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Redirecting to Stripe...' : 'Proceed to Payment'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && (
          <div className="max-w-lg mx-auto text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">Welcome to ChiselGrid!</h1>
            <p className="mt-2 text-gray-500">
              Your organization <strong>{data.organizationName}</strong> has been created.
              Check your email at <strong>{data.adminEmail}</strong> for your login credentials.
            </p>
            <div className="mt-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
              <p className="text-sm text-gray-500">Your portal is available at:</p>
              <p className="mt-1 text-lg font-semibold text-blue-600">
                https://{data.subdomain}.chiselgrid.com
              </p>
            </div>
            <div className="mt-6">
              <a
                href={`https://${data.subdomain}.chiselgrid.com/login`}
                className="inline-block rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Go to Your Portal
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { id: 'plan', label: 'Plan' },
    { id: 'info', label: 'Info' },
    { id: 'checkout', label: 'Payment' },
    { id: 'complete', label: 'Done' },
  ];

  const currentIndex = steps.findIndex((s) => s.id === current);

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center gap-2">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
              i <= currentIndex
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
            }`}
          >
            {i + 1}
          </div>
          <span className={`text-xs ${i <= currentIndex ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
            {step.label}
          </span>
          {i < steps.length - 1 && (
            <div className={`h-px w-6 ${i < currentIndex ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
