'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import validator from 'validator';
import { useStrings } from '@/contexts/LanguageContext';

export default function ContactPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: 'general',
    message: ''
  });
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
        setErrorMessage(strings.forms?.validation?.invalidEmail || 'Please enter a valid email address');
        setIsSubmitting(false);
        return;
      }

      // Submit to Netlify Forms
      const formBody = new URLSearchParams({
        'form-name': 'contact',
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
          </div>
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
