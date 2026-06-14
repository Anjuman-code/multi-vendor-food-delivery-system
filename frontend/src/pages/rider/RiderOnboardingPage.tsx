import {
  OnboardingLayout,
  OptionCard,
  StepHeader,
  StepNav,
  type OnboardingStep,
} from '@/components/onboarding';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/toast';
import { applyServerErrors, getErrorMessage } from '@/lib/formErrors';
import { optionalBdPhoneSchema } from '@/lib/phone';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import {
  Banknote,
  CheckCircle2,
  Clock,
  Coins,
  FileCheck2,
  FileImage,
  Loader2,
  Rocket,
  ShieldCheck,
  Smartphone,
  Truck,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

const MOBILE_MONEY_PROVIDERS = [
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'rocket', label: 'Rocket' },
  { value: 'upay', label: 'Upay' },
];

const onboardingSchema = z.object({
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  accountHolderName: z.string().optional(),
  mobileMoneyNumber: optionalBdPhoneSchema as unknown as z.ZodOptional<z.ZodString>,
  mobileMoneyProvider: z.string().optional(),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

const STEPS: OnboardingStep[] = [
  { id: 'welcome', label: 'Welcome', description: 'How it works', icon: Truck },
  {
    id: 'documents',
    label: 'Documents',
    description: 'Verify your identity',
    icon: FileImage,
  },
  {
    id: 'payout',
    label: 'Payout',
    description: 'Get paid your way',
    icon: Wallet,
  },
  {
    id: 'submit',
    label: 'Submit',
    description: 'Send for review',
    icon: Rocket,
  },
];

const DOCUMENT_FIELDS = [
  {
    key: 'licensePhoto',
    label: "Driver's license",
    hint: 'Front side, clearly readable',
    required: true,
  },
  {
    key: 'vehicleRegistrationPhoto',
    label: 'Vehicle registration',
    hint: 'Matches your registered vehicle',
    required: true,
  },
  {
    key: 'insurancePhoto',
    label: 'Insurance document',
    hint: 'Must be currently valid',
    required: true,
  },
] as const;

const REQUIRED_DOCUMENT_KEYS = DOCUMENT_FIELDS.filter((f) => f.required).map(
  (f) => f.key,
);

type PayoutMethod = 'mobile' | 'bank';

const RiderOnboardingPage: React.FC = () => {
  const [step, setStep] = useState(0);
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('mobile');
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Record<string, string>>({});
  const [documentErrors, setDocumentErrors] = useState<Record<string, string>>(
    {},
  );
  const [existingProfile, setExistingProfile] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { default: riderService } =
          await import('@/services/riderService');
        const res = await riderService.getProfile();
        const profile =
          (res.data as { data?: { profile: Record<string, unknown> } }).data
            ?.profile ?? {};
        setExistingProfile(profile);
        const docs = (profile?.documents as Record<string, string>) ?? {};
        DOCUMENT_FIELDS.forEach(({ key }) => {
          if (docs[key])
            setDocuments((prev) => ({ ...prev, [key]: docs[key] }));
        });
        if (profile?.onboardingCompleted) {
          navigate('/rider', { replace: true });
        }
      } catch {
        // Profile not created yet — first-time rider
      } finally {
        setProfileLoading(false);
      }
    };
    void fetchProfile();
  }, [navigate]);

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      bankName: '',
      accountNumber: '',
      accountHolderName: '',
      mobileMoneyNumber: '',
      mobileMoneyProvider: undefined,
    },
    mode: 'onTouched',
  });

  useEffect(() => {
    if (existingProfile?.bankDetails) {
      const bd = existingProfile.bankDetails as Record<
        string,
        string | undefined
      >;
      if (bd.bankName) form.setValue('bankName', bd.bankName);
      if (bd.accountNumber) form.setValue('accountNumber', bd.accountNumber);
      if (bd.accountHolderName)
        form.setValue('accountHolderName', bd.accountHolderName);
      if (bd.mobileMoneyNumber)
        form.setValue('mobileMoneyNumber', bd.mobileMoneyNumber);
      if (bd.mobileMoneyProvider) {
        form.setValue('mobileMoneyProvider', bd.mobileMoneyProvider);
        setPayoutMethod('mobile');
      } else if (bd.bankName) {
        setPayoutMethod('bank');
      }
    }
  }, [existingProfile, form]);

  const handleFileUpload = useCallback(
    async (fieldName: string, file: File) => {
      setUploading(fieldName);
      try {
        const { default: riderService } =
          await import('@/services/riderService');
        const formData = new FormData();
        formData.append('document', file);
        formData.append('documentType', fieldName);
        const res = await riderService.uploadDocument(formData);
        const url = (res.data as { data?: { documentUrl: string } }).data
          ?.documentUrl;
        if (url) {
          setDocuments((prev) => ({ ...prev, [fieldName]: url }));
          setDocumentErrors((prev) => {
            if (!prev[fieldName]) return prev;
            const next = { ...prev };
            delete next[fieldName];
            return next;
          });
          toast.success('Uploaded', {
            description: `${DOCUMENT_FIELDS.find((f) => f.key === fieldName)?.label} uploaded successfully`,
          });
        }
      } catch {
        toast.error('Upload failed', {
          description: 'Please try again',
        });
      } finally {
        setUploading(null);
      }
    },
    [],
  );

  const triggerUpload = (fieldName: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) void handleFileUpload(fieldName, file);
    };
    input.click();
  };

  /**
   * Validate that every required document has been uploaded. Sets inline
   * errors beneath any missing upload and returns whether the step is valid.
   */
  const validateDocuments = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    REQUIRED_DOCUMENT_KEYS.forEach((key) => {
      if (!documents[key]) {
        const label = DOCUMENT_FIELDS.find((f) => f.key === key)?.label ?? key;
        errors[key] = `${label} is required`;
      }
    });
    setDocumentErrors(errors);
    return Object.keys(errors).length === 0;
  }, [documents]);

  const handleDocumentsNext = () => {
    if (!validateDocuments()) {
      toast.error('Missing required documents', {
        description: 'Please upload all required documents to continue.',
      });
      return;
    }
    setStep(2);
  };

  const submitOnboarding = async () => {
    // Re-check both gated steps before hitting the API.
    const docsValid = validateDocuments();
    const payoutValid = await form.trigger();
    if (!docsValid) {
      setStep(1);
      toast.error('Missing required documents', {
        description: 'Please upload all required documents before submitting.',
      });
      return;
    }
    if (!payoutValid) {
      setStep(2);
      toast.error('Check your payout details', {
        description: 'Please fix the highlighted fields before submitting.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const data = form.getValues();
      const { default: riderService } = await import('@/services/riderService');
      await riderService.completeOnboardingWithDetails({
        bankName: data.bankName || undefined,
        accountNumber: data.accountNumber || undefined,
        accountHolderName: data.accountHolderName || undefined,
        mobileMoneyNumber: data.mobileMoneyNumber || undefined,
        mobileMoneyProvider: data.mobileMoneyProvider || undefined,
      });
      updateUser({ onboardingCompleted: true });
      toast.success('Application submitted!', {
        description: "We'll review your details and notify you once approved.",
      });
      navigate('/rider', { replace: true });
    } catch (err) {
      const mapped = applyServerErrors(form, err, { toastOnUnmapped: false });
      if (mapped) {
        setStep(2);
      } else {
        toast.error(getErrorMessage(err, 'Something went wrong'), {
          description: 'Please try again in a moment.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const uploadedCount = Object.keys(documents).length;

  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <OnboardingLayout role="rider" steps={STEPS} currentStep={step}>
      {/* ── Step 0: Welcome ── */}
      {step === 0 && (
        <div>
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-red-500 text-white shadow-lg shadow-brand-500/25">
            <Truck className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Welcome to the Food Rush fleet
          </h2>
          <p className="mt-2 max-w-md text-[0.95rem] leading-relaxed text-muted-foreground">
            You're almost ready to start earning. Here's what we'll need before
            you can hit the road.
          </p>

          <div className="mt-7 space-y-3">
            {[
              {
                icon: FileImage,
                title: 'Verify your documents',
                desc: 'License, vehicle registration and insurance.',
              },
              {
                icon: Wallet,
                title: 'Set up your payout',
                desc: 'Mobile money or bank — get paid weekly.',
              },
              {
                icon: ShieldCheck,
                title: 'Quick admin review',
                desc: "We'll approve you and you can start delivering.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-foreground">{title}</p>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-2.5 rounded-xl bg-emerald-50/70 px-4 py-3 text-sm text-emerald-700">
            <Coins className="h-4 w-4 shrink-0" />
            Keep 100% of your tips, every single time.
          </div>

          <StepNav nextLabel="Get started" onNext={() => setStep(1)} />
        </div>
      )}

      {/* ── Step 1: Documents ── */}
      {step === 1 && (
        <div>
          <StepHeader
            icon={FileImage}
            title="Upload your documents"
            subtitle="Clear photos help us verify you faster. You can replace any document before submitting."
          />

          <div className="space-y-3">
            {DOCUMENT_FIELDS.map((doc) => {
              const done = !!documents[doc.key];
              const error = documentErrors[doc.key];
              return (
                <div key={doc.key}>
                  <div
                    className={`flex items-center justify-between gap-3 rounded-2xl border-2 p-4 transition-colors ${
                      error
                        ? 'border-red-300 bg-red-50/50'
                        : done
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                          done
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {done ? (
                          <FileCheck2 className="h-5 w-5" />
                        ) : (
                          <FileImage className="h-5 w-5" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">
                          {doc.label}
                          {doc.required && (
                            <span className="ml-1 text-red-500">*</span>
                          )}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {done ? 'Uploaded — looks good' : doc.hint}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {done && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setDocuments((prev) => {
                              const next = { ...prev };
                              delete next[doc.key];
                              return next;
                            })
                          }
                          className="text-muted-foreground hover:text-red-600"
                          aria-label={`Remove ${doc.label}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant={done ? 'outline' : 'default'}
                        size="sm"
                        disabled={uploading === doc.key}
                        onClick={() => triggerUpload(doc.key)}
                        className="gap-1.5"
                      >
                        {uploading === doc.key ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {done ? 'Replace' : 'Upload'}
                      </Button>
                    </div>
                  </div>
                  {error && (
                    <p className="mt-1.5 px-1 text-sm font-medium text-red-600">
                      {error}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <p className="text-xs leading-relaxed text-amber-700">
              Your documents are encrypted and used only for verification.
              Documents marked with an asterisk (*) are required to continue.
            </p>
          </div>

          <StepNav
            onBack={() => setStep(0)}
            nextLabel="Continue"
            onNext={handleDocumentsNext}
          />
        </div>
      )}

      {/* ── Step 2: Payout ── */}
      {step === 2 && (
        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void form.trigger().then((valid) => {
                if (valid) setStep(3);
              });
            }}
          >
            <StepHeader
              icon={Wallet}
              title="How would you like to get paid?"
              subtitle="Choose your preferred payout method. Mobile money lands instantly; bank transfers run weekly."
            />

            <div className="space-y-3">
              <OptionCard
                icon={Smartphone}
                title="Mobile money"
                description="bKash, Nagad, Rocket or Upay — paid instantly"
                badge="Recommended"
                selected={payoutMethod === 'mobile'}
                onSelect={() => setPayoutMethod('mobile')}
              />
              <OptionCard
                icon={Banknote}
                title="Bank transfer"
                description="Weekly payout straight to your bank account"
                selected={payoutMethod === 'bank'}
                onSelect={() => setPayoutMethod('bank')}
              />
            </div>

            {payoutMethod === 'mobile' ? (
              <div className="mt-5 space-y-4 rounded-2xl border border-border bg-muted/40 p-4">
                <FormField
                  control={form.control}
                  name="mobileMoneyProvider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MOBILE_MONEY_PROVIDERS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mobileMoneyNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile money number</FormLabel>
                      <FormControl>
                        <Input placeholder="01XXXXXXXXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <div className="mt-5 space-y-4 rounded-2xl border border-border bg-muted/40 p-4">
                <FormField
                  control={form.control}
                  name="accountHolderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account holder name</FormLabel>
                      <FormControl>
                        <Input placeholder="Full name on account" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bankName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Dutch-Bangla Bank"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter account number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <StepNav
              submit
              onBack={() => setStep(1)}
              onSkip={() => setStep(3)}
              skipLabel="Add later"
              nextLabel="Continue"
            />
          </form>
        </Form>
      )}

      {/* ── Step 3: Submit ── */}
      {step === 3 && (
        <div>
          <StepHeader
            icon={Rocket}
            title="Review & submit"
            subtitle="Here's a snapshot of your application. Submit it for review — you'll be notified the moment you're approved."
          />

          <div className="space-y-3">
            <SummaryRow
              icon={FileImage}
              title="Documents"
              value={`${uploadedCount} of ${DOCUMENT_FIELDS.length} uploaded`}
              ok={uploadedCount > 0}
            />
            <SummaryRow
              icon={Wallet}
              title="Payout method"
              value={
                payoutMethod === 'mobile' ? 'Mobile money' : 'Bank transfer'
              }
              ok
            />
            <SummaryRow
              icon={Clock}
              title="Admin review"
              value="Pending — usually within 24 hours"
              ok={false}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 flex items-start gap-2.5 rounded-xl border border-brand-100 bg-brand-50/60 p-4"
          >
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <p className="text-sm leading-relaxed text-foreground/80">
              By submitting, you confirm your details are accurate. You'll get
              full access to your dashboard while we complete the review.
            </p>
          </motion.div>

          <StepNav
            onBack={() => setStep(2)}
            nextLabel="Submit application"
            onNext={submitOnboarding}
            isLoading={isLoading}
          />
        </div>
      )}
    </OnboardingLayout>
  );
};

const SummaryRow = ({
  icon: Icon,
  title,
  value,
  ok,
}: {
  icon: typeof FileImage;
  title: string;
  value: string;
  ok: boolean;
}) => (
  <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
      <Icon className="h-5 w-5" />
    </span>
    <div className="min-w-0 flex-1">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{value}</p>
    </div>
    {ok ? (
      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
    ) : (
      <Clock className="h-5 w-5 shrink-0 text-amber-500" />
    )}
  </div>
);

export default RiderOnboardingPage;
