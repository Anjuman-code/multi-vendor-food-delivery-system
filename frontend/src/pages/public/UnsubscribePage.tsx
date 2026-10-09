import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { emailService, EmailPreferences } from '@/services/emailService';
import { CheckCircle2, AlertTriangle, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { ROUTES } from '@/constants/routes';

export const UnsubscribePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [email, setEmail] = useState<string>('');
  const [preferences, setPreferences] = useState<EmailPreferences>({
    orderUpdates: true,
    accountAlerts: true,
    reviewRequests: false,
    promotions: false,
    newsletter: false,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!token) {
        setLoading(false);
        setErrorMessage('No unsubscribe token was provided. If you want to manage your email preferences, please log in to your account.');
        return;
      }

      try {
        setLoading(true);
        const data = await emailService.getPreferences(token);
        if (data.email) setEmail(data.email);
        if (data.preferences) setPreferences(data.preferences);
      } catch (err: any) {
        setErrorMessage(
          err.response?.data?.message || 'Invalid or expired unsubscribe link. Please log in to manage your preferences.',
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [token]);

  const handleToggle = (key: keyof EmailPreferences) => {
    if (key === 'orderUpdates' || key === 'accountAlerts') return; // Immutable transactional categories
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!token) return;
    try {
      setSaving(true);
      await emailService.unsubscribe({
        token,
        preferences,
      });
      setSuccessMessage('Your email preferences have been updated successfully.');
      toast.success('Email preferences updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleUnsubscribeAll = async () => {
    if (!token) return;
    try {
      setSaving(true);
      await emailService.unsubscribe({
        token,
        unsubscribeAll: true,
      });
      setPreferences((prev) => ({
        ...prev,
        reviewRequests: false,
        promotions: false,
        newsletter: false,
      }));
      setSuccessMessage('You have been unsubscribed from all marketing, promotional, and review emails.');
      toast.success('Unsubscribed from marketing emails');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to process unsubscribe request.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900/50">
      <Card className="w-full max-w-xl shadow-lg border-slate-200 dark:border-slate-800">
        <CardHeader className="text-center pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="mx-auto w-12 h-12 bg-orange-100 dark:bg-orange-950/50 text-orange-600 rounded-full flex items-center justify-center mb-3">
            <Mail className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Email Notifications & Preferences</CardTitle>
          <CardDescription className="text-sm mt-1">
            {email ? (
              <span>Managing preferences for <strong className="text-slate-800 dark:text-slate-200">{email}</strong></span>
            ) : (
              'Manage which emails you receive from Food Rush.'
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              <p className="text-sm text-slate-500">Loading your preferences...</p>
            </div>
          ) : errorMessage ? (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex gap-3 items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 dark:text-red-300">
                <p className="font-semibold mb-1">Notice</p>
                <p>{errorMessage}</p>
                <div className="mt-4">
                  <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.AUTH.LOGIN)}>
                    Log in to Manage Preferences
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {successMessage && (
                <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex gap-3 items-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">{successMessage}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* 1. Order Updates (Mandatory) */}
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="space-y-0.5 pr-4">
                    <div className="flex items-center gap-2">
                      <Label className="font-medium text-slate-900 dark:text-slate-100">Order & Delivery Updates</Label>
                      <Badge variant="outline" className="text-xs bg-slate-200/60 dark:bg-slate-700 border-none font-normal">
                        Required
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Receipts, live courier tracking, cancellations, and refund confirmations.
                    </p>
                  </div>
                  <Switch checked={true} disabled aria-label="Order updates cannot be disabled" />
                </div>

                {/* 2. Security Alerts (Mandatory) */}
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="space-y-0.5 pr-4">
                    <div className="flex items-center gap-2">
                      <Label className="font-medium text-slate-900 dark:text-slate-100">Security & Account Alerts</Label>
                      <Badge variant="outline" className="text-xs bg-slate-200/60 dark:bg-slate-700 border-none font-normal">
                        Required
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Password resets, verification codes, and unauthorized activity notifications.
                    </p>
                  </div>
                  <Switch checked={true} disabled aria-label="Security alerts cannot be disabled" />
                </div>

                {/* 3. Review Requests */}
                <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="space-y-0.5 pr-4">
                    <Label htmlFor="reviewRequests" className="font-medium text-slate-900 dark:text-slate-100 cursor-pointer">
                      Review & Feedback Requests
                    </Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Occasional invitations to rate dishes and restaurants you recently ordered from.
                    </p>
                  </div>
                  <Switch
                    id="reviewRequests"
                    checked={preferences.reviewRequests}
                    onCheckedChange={() => handleToggle('reviewRequests')}
                  />
                </div>

                {/* 4. Promotional Offers */}
                <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="space-y-0.5 pr-4">
                    <Label htmlFor="promotions" className="font-medium text-slate-900 dark:text-slate-100 cursor-pointer">
                      Special Offers & Discounts
                    </Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Exclusive discount codes, seasonal deals, and restaurant flash sales.
                    </p>
                  </div>
                  <Switch
                    id="promotions"
                    checked={preferences.promotions}
                    onCheckedChange={() => handleToggle('promotions')}
                  />
                </div>

                {/* 5. Weekly Newsletter */}
                <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="space-y-0.5 pr-4">
                    <Label htmlFor="newsletter" className="font-medium text-slate-900 dark:text-slate-100 cursor-pointer">
                      Weekly Foodie Digest
                    </Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Trending restaurants in your city and curated culinary recommendations.
                    </p>
                  </div>
                  <Switch
                    id="newsletter"
                    checked={preferences.newsletter}
                    onCheckedChange={() => handleToggle('newsletter')}
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  type="button"
                  className="w-full text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/30"
                  onClick={handleUnsubscribeAll}
                  disabled={saving}
                >
                  Unsubscribe from all promotional emails
                </Button>
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3 justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
          <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.PUBLIC.HOME)} className="w-full sm:w-auto">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Food Rush
          </Button>

          {!loading && !errorMessage && (
            <Button
              size="sm"
              className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white font-medium"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Preferences'
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default UnsubscribePage;
