'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import validator from 'validator';
import { useStrings } from '@/contexts/LanguageContext';
import { bugTracker } from '@/services/bugTracking';

function ContactForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: 'general',
    message: ''
  });
  const [messageLength, setMessageLength] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const strings = useStrings();

  // Handle URL parameters for pre-selecting category
  useEffect(() => {
    const category = searchParams.get('category');
    if (category && ['general', 'bug', 'feedback', 'feature', 'support'].includes(category)) {
      setFormData(prev => ({
        ...prev,
        category,
        subject: category === 'bug' ? 'Bug Report: ' :
          category === 'feedback' ? 'Feedback: ' :
            category === 'feature' ? 'Feature Request: ' :
              category === 'support' ? 'Technical Support: ' : ''
      }));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Validate email before sending
      if (!validator.isEmail(formData.email)) {
        setErrorMessage(strings.contact?.form?.validation?.emailInvalid || strings.forms?.validation?.invalidEmail || 'Please enter a valid email address');
        setIsSubmitting(false);
        return;
      }
      
      // Validate message length
      if (formData.message.length < 10) {
        setErrorMessage(strings.contact?.form?.validation?.messageTooShort || 'Message must be at least 10 characters');
        setIsSubmitting(false);
        return;
      }
      
      if (formData.message.length > 5000) {
        setErrorMessage(strings.contact?.form?.validation?.messageTooLong || 'Message exceeds the 5000 character limit');
        setIsSubmitting(false);
        return;
      }

      // Submit to Netlify Forms - use the appropriate form based on category
      const formName = `contact-${formData.category}`;
      const formBody = new URLSearchParams({
        'form-name': formName,
        ...formData
      }).toString();

      // For Next.js apps, we need to ensure Netlify can intercept the form
      // Try submitting to the static HTML file first, then fallback to root
      let response;
      try {
        response = await fetch('/netlify-forms.html', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formBody
        });
      } catch (error) {
        // Fallback to root if the static file isn't accessible
        response = await fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formBody
        });
      }

      // Netlify returns a 200 or 303 redirect on successful form submission
      if (response.ok || response.status === 303) {
        // Save bug reports and feedback to Firestore for tracking
        if (['bug', 'feedback', 'feature', 'support'].includes(formData.category)) {
          try {
            await bugTracker.createBugReport({
              category: formData.category,
              name: formData.name,
              email: formData.email,
              subject: formData.subject,
              message: formData.message,
              url: window.location.href,
              userAgent: navigator.userAgent
            });

          } catch (firestoreError) {
            // Don't block the success flow if Firestore fails
            console.error('Failed to save to Firestore:', firestoreError);
          }
        }
        
        setShowSuccess(true);
        setFormData({
          name: '',
          email: '',
          subject: '',
          category: 'general',
          message: ''
        });
      } else {
        console.error('Form submission failed with status:', response.status);
        throw new Error(`Form submission failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Contact form error:', error);
      setErrorMessage('Sorry, there was an error sending your message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Track message length for character counter
    if (name === 'message') {
      setMessageLength(value.length);
    }
  };

  if (showSuccess) {
    return (
      <>
        {/* Top Gradient Section */}
        <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />
          <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />
        </div>
        {/* Main Content */}
        <div className="container mx-auto px-4 py-8 min-h-screen">
          <PageHeader title={strings.contact.title} />
          <main className="max-w-md mx-auto mb-32 md:mb-8 pb-safe">
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                {strings.contact.successTitle}
              </h2>
              <p className="text-muted-foreground mb-6">
                {strings.contact.successMessage}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => setShowSuccess(false)}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {strings.contact.sendAnother}
                </button>
                <button
                  onClick={() => router.back()}
                  className="w-full px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  {strings.common.back}
                </button>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Top Gradient Section */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />
      </div>
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 min-h-screen">
        <PageHeader title={strings.contact.title} />
        <main className="max-w-2xl mx-auto mb-32 md:mb-8 pb-safe">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">💬</div>
              <h1 className="text-xl font-semibold text-foreground mb-2">
                {strings.contact.getInTouch}
              </h1>
              <p className="text-muted-foreground">
                {strings.contact.intro}
              </p>
            </div>
            {/* Actual form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="hidden" name="form-name" value="contact" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                    {strings.contact.form.name} *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder={strings.contact.form.placeholders.name}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                    {strings.contact.form.email} *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder={strings.contact.form.placeholders.email}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-foreground mb-2">
                  {strings.contact.form.category}
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="general">{strings.contact.form.categories.general}</option>
                  <option value="bug">{strings.contact.form.categories.bug}</option>
                  <option value="feedback">{strings.contact.form.categories.feedback}</option>
                  <option value="feature">{strings.contact.form.categories.feature}</option>
                  <option value="support">{strings.contact.form.categories.support}</option>
                </select>
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-2">
                  {strings.contact.form.subject}
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder={strings.contact.form.placeholders.subject}
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                  {strings.contact.form.message} *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={5}
                  placeholder={strings.contact.form.placeholders.message}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? strings.contact.sending : strings.contact.sendMessage}
                </button>
              </div>
            </form>
            
            {/* Tips for Effective Communication */}
            {strings.contact.form?.tips && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  {strings.contact.form.tips.title}
                </h3>
                <ul className="space-y-1">
                  {strings.contact.form.tips.items.map((tip: string, index: number) => (
                    <li key={index} className="text-xs text-blue-800 dark:text-blue-200 flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Urgent Note */}
            {strings.contact.urgentNote && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-4 text-center">
                ⚠️ {strings.contact.urgentNote}
              </p>
            )}
          </div>
          
          {/* FAQ Section */}
          {strings.contact.faq && (
            <div className="mt-6 bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">
                {strings.contact.faq.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {strings.contact.faq.description}
              </p>
              <ul className="space-y-2">
                {strings.contact.faq.items.map((item: string, index: number) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Alternative Contact Methods */}
          {strings.contact.alternativeContact && (
            <div className="mt-6 bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                {strings.contact.alternativeContact.title}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">
                    {strings.contact.alternativeContact.email.label}
                  </h4>
                  <div className="space-y-1">
                    <a href={`mailto:${strings.contact.alternativeContact.email.general}`} className="text-sm text-primary hover:underline block">
                      {strings.contact.alternativeContact.email.general}
                    </a>
                    <a href={`mailto:${strings.contact.alternativeContact.email.privacy}`} className="text-sm text-primary hover:underline block">
                      {strings.contact.alternativeContact.email.privacy}
                    </a>
                    <a href={`mailto:${strings.contact.alternativeContact.email.partnerships}`} className="text-sm text-primary hover:underline block">
                      {strings.contact.alternativeContact.email.partnerships}
                    </a>
                  </div>
                </div>
                {strings.contact.alternativeContact.social && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">
                      {strings.contact.alternativeContact.social.label}
                    </h4>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {strings.contact.alternativeContact.social.twitter}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {strings.contact.alternativeContact.social.discord}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Business Hours */}
          {strings.contact.businessHours && (
            <div className="mt-6 text-center p-4 bg-muted/30 rounded-lg">
              <h4 className="text-sm font-medium text-foreground mb-2">
                {strings.contact.businessHours.title}
              </h4>
              <p className="text-xs text-muted-foreground">
                {strings.contact.businessHours.description}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {strings.contact.businessHours.hours}
              </p>
              <p className="text-xs text-muted-foreground">
                {strings.contact.businessHours.weekends} • {strings.contact.businessHours.holidays}
              </p>
            </div>
          )}
        </main>
      </div>
      {/* Error Message Modal */}
      {errorMessage && (
        <ConfirmationDialog
          isOpen={!!errorMessage}
          title={strings.errors.general}
          message={errorMessage}
          confirmText={strings.common.ok}
          cancelText=""
          isDestructive={false}
          onConfirm={() => setErrorMessage(null)}
          onCancel={() => setErrorMessage(null)}
          loading={false}
        />
      )}
    </>
  );
}

export default function ContactPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <ContactForm />
    </Suspense>
  );
}
