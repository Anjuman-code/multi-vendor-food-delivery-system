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
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Banknote,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  FileImage,
  Loader2,
  ShieldCheck,
  Truck,
  Upload,
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
  mobileMoneyNumber: z.string().optional(),
  mobileMoneyProvider: z.string().optional(),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

const STEPS = [
  { label: 'Documents', description: 'Upload your documents' },
  { label: 'Payout', description: 'Set up your payout' },
  { label: 'Ready', description: 'Start delivering' },
];

const DOCUMENT_FIELDS = [
  { key: 'licensePhoto', label: "Driver's License", accept: 'image/*' },
  { key: 'vehicleRegistrationPhoto', label: 'Vehicle Registration', accept: 'image/*' },
  { key: 'insurancePhoto', label: 'Insurance Document', accept: 'image/*' },
] as const;

const RiderOnboardingPage: React.FC = () => {
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Record<string, string>>({});
  const [existingProfile, setExistingProfile] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updateUser } = useAuth();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { default: riderService } = await import('@/services/riderService');
        const res = await riderService.getProfile();
        const profile = (res.data as { data?: { profile: Record<string, unknown> } }).data?.profile ?? {};
        setExistingProfile(profile);
        const docs = (profile?.documents as Record<string, string>) ?? {};
        if (docs.licensePhoto) setDocuments((prev) => ({ ...prev, licensePhoto: docs.licensePhoto }));
        if (docs.vehicleRegistrationPhoto) setDocuments((prev) => ({ ...prev, vehicleRegistrationPhoto: docs.vehicleRegistrationPhoto }));
        if (docs.insurancePhoto) setDocuments((prev) => ({ ...prev, insurancePhoto: docs.insurancePhoto }));
        if (profile?.onboardingCompleted) {
          navigate('/rider', { replace: true });
        }
      } catch {
        // Profile not found yet
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
      const bd = existingProfile.bankDetails as Record<string, string | undefined>;
      if (bd.bankName) form.setValue('bankName', bd.bankName);
      if (bd.accountNumber) form.setValue('accountNumber', bd.accountNumber);
      if (bd.accountHolderName) form.setValue('accountHolderName', bd.accountHolderName);
      if (bd.mobileMoneyNumber) form.setValue('mobileMoneyNumber', bd.mobileMoneyNumber);
      if (bd.mobileMoneyProvider) form.setValue('mobileMoneyProvider', bd.mobileMoneyProvider);
    }
  }, [existingProfile, form]);

  const handleFileUpload = useCallback(async (fieldName: string, file: File) => {
    setUploading(fieldName);
    try {
      const { default: riderService } = await import('@/services/riderService');
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', fieldName);
      const res = await riderService.uploadDocument(formData);
      const url = (res.data as { data?: { documentUrl: string } }).data?.documentUrl;
      if (url) {
        setDocuments((prev) => ({ ...prev, [fieldName]: url }));
        toast({ title: 'Uploaded', description: `${DOCUMENT_FIELDS.find(f => f.key === fieldName)?.label} uploaded successfully` });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Upload failed', description: 'Please try again' });
    } finally {
      setUploading(null);
    }
  }, [toast]);

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

  const onSubmit = async () => {
    if (step === 0) {
      setStep(1);
      return;
    }
    if (step === 1) {
      setStep(2);
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
      toast({
        title: 'Welcome aboard!',
        description: 'Your onboarding is complete. You can now start delivering.',
      });
      navigate('/rider', { replace: true });
    } catch {
      toast({ variant: 'destructive', title: 'Failed', description: 'Something went wrong. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
            <Truck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Complete Your Setup</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Just a few steps to start earning
          </p>
        </div>

        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    i <= step ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <div className="hidden sm:block">
                  <p className={`text-xs font-medium ${i === step ? 'text-gray-900' : 'text-gray-400'}`}>
                    {s.label}
                  </p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 ${i < step ? 'bg-orange-400' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <AnimatePresence mode="wait">
                {step === 0 && (
                  <motion.div
                    key="step0"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    className="space-y-4"
                  >
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Upload Documents</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Please upload clear photos of the following documents
                      </p>
                    </div>

                    {DOCUMENT_FIELDS.map((doc) => (
                      <div key={doc.key} className="border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              documents[doc.key] ? 'bg-green-50' : 'bg-gray-50'
                            }`}>
                              {documents[doc.key]
                                ? <CheckCircle className="w-5 h-5 text-green-500" />
                                : <FileImage className="w-5 h-5 text-gray-400" />
                              }
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{doc.label}</p>
                              {documents[doc.key] && (
                                <p className="text-xs text-green-600">Uploaded</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {documents[doc.key] && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setDocuments((prev) => {
                                  const next = { ...prev };
                                  delete next[doc.key];
                                  return next;
                                })}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={uploading === doc.key}
                              onClick={() => triggerUpload(doc.key)}
                            >
                              {uploading === doc.key
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Upload className="w-4 h-4 mr-1" />
                              }
                              {documents[doc.key] ? 'Replace' : 'Upload'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700">
                        Your documents are securely stored and will only be used for verification purposes.
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={() => setStep(1)}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </motion.div>
                )}

                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    className="space-y-4"
                  >
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Payout Details</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Set up how you want to receive your earnings
                      </p>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 flex items-center gap-3">
                      <Banknote className="w-8 h-8 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Mobile Money (Recommended)</p>
                        <p className="text-xs text-gray-500">Get paid instantly to your mobile wallet</p>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="mobileMoneyProvider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile Money Provider</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? ''}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select provider" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {MOBILE_MONEY_PROVIDERS.map((p) => (
                                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
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
                          <FormLabel>Mobile Money Number</FormLabel>
                          <FormControl>
                            <Input placeholder="01XXXXXXXXX" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-200" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-gray-400">Or bank transfer</span>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="accountHolderName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Holder Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Full name on bank account" {...field} />
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
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Dutch-Bangla Bank" {...field} />
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
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter bank account number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="outline" onClick={() => setStep(0)} className="flex-1">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Back
                      </Button>
                      <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-6 text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                      <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-gray-900">You're All Set!</h3>
                      <p className="text-gray-500 text-sm mt-1">
                        Your onboarding is complete. Your application is pending admin approval.
                        You'll be notified once approved and can start accepting deliveries.
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Documents Uploaded</p>
                          <p className="text-xs text-gray-500">
                            {Object.keys(documents).length} of {DOCUMENT_FIELDS.length} documents
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Payout Method Set</p>
                          <p className="text-xs text-gray-500">Ready to receive earnings</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Pending Admin Review</p>
                          <p className="text-xs text-gray-500">You'll be notified once approved</p>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {isLoading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Completing…</>
                      ) : (
                        'Complete Setup'
                      )}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </Form>
        </div>
      </motion.div>
    </div>
  );
};

export default RiderOnboardingPage;
