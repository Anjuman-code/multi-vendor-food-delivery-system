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
import { useToast } from '@/hooks/use-toast';
import { optionalBdPhoneSchema } from '@/lib/phone';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import {
  BadgeCheck,
  Banknote,
  CheckCircle,
  FileImage,
  IdCard,
  Loader2,
  Upload,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';

const profileSchema = z.object({
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  accountHolderName: z.string().optional(),
  mobileMoneyNumber: optionalBdPhoneSchema,
  mobileMoneyProvider: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const MOBILE_MONEY_PROVIDERS = [
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'rocket', label: 'Rocket' },
  { value: 'upay', label: 'Upay' },
];

const DOCUMENT_FIELDS = [
  { key: 'licensePhoto', label: "Driver's License" },
  { key: 'vehicleRegistrationPhoto', label: 'Vehicle Registration' },
  { key: 'insurancePhoto', label: 'Insurance Document' },
] as const;

const RiderProfilePage: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Record<string, string>>({});
  const [applicationStatus, setApplicationStatus] = useState<string>('pending');

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      bankName: '',
      accountNumber: '',
      accountHolderName: '',
      mobileMoneyNumber: '',
      mobileMoneyProvider: undefined,
    },
    mode: 'onTouched',
  });

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { default: riderService } = await import('@/services/riderService');
      const res = await riderService.getProfile();
      const profile =
        (res.data as { data?: { profile: Record<string, unknown> } }).data
          ?.profile ?? {};

      setApplicationStatus((profile?.applicationStatus as string) ?? 'pending');

      const docs = (profile?.documents as Record<string, string>) ?? {};
      if (docs.licensePhoto)
        setDocuments((prev) => ({ ...prev, licensePhoto: docs.licensePhoto }));
      if (docs.vehicleRegistrationPhoto)
        setDocuments((prev) => ({
          ...prev,
          vehicleRegistrationPhoto: docs.vehicleRegistrationPhoto,
        }));
      if (docs.insurancePhoto)
        setDocuments((prev) => ({
          ...prev,
          insurancePhoto: docs.insurancePhoto,
        }));

      const bd =
        (profile?.bankDetails as Record<string, string | undefined>) ?? {};
      if (bd.bankName) form.setValue('bankName', bd.bankName);
      if (bd.accountNumber) form.setValue('accountNumber', bd.accountNumber);
      if (bd.accountHolderName)
        form.setValue('accountHolderName', bd.accountHolderName);
      if (bd.mobileMoneyNumber)
        form.setValue('mobileMoneyNumber', bd.mobileMoneyNumber);
      if (bd.mobileMoneyProvider)
        form.setValue('mobileMoneyProvider', bd.mobileMoneyProvider);
    } catch {
      toast({ variant: 'destructive', title: 'Error loading profile' });
    } finally {
      setLoading(false);
    }
  }, [form, toast]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const handleFileUpload = useCallback(
    async (fieldName: string) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        setUploading(fieldName);
        try {
          const { default: riderService } =
            await import('@/services/riderService');
          const formData = new FormData();
          formData.append('document', file);
          formData.append('documentType', fieldName);
          const res = await riderService.uploadDocument(formData);
          const documentUrl = (res.data as { data?: { documentUrl: string } })
            .data?.documentUrl;
          if (documentUrl) {
            setDocuments((prev) => ({ ...prev, [fieldName]: documentUrl }));
            toast({
              title: 'Uploaded',
              description: 'Document updated successfully',
            });
          }
        } catch {
          toast({ variant: 'destructive', title: 'Upload failed' });
        } finally {
          setUploading(null);
        }
      };
      input.click();
    },
    [toast],
  );

  const onSubmit = async (data: ProfileFormData) => {
    setSaving(true);
    try {
      const { default: riderService } = await import('@/services/riderService');
      await riderService.updateProfile({
        bankDetails: {
          bankName: data.bankName || undefined,
          accountNumber: data.accountNumber || undefined,
          accountHolderName: data.accountHolderName || undefined,
          mobileMoneyNumber: data.mobileMoneyNumber || undefined,
          mobileMoneyProvider: data.mobileMoneyProvider || undefined,
        },
      });
      toast({ title: 'Saved', description: 'Profile updated successfully' });
    } catch {
      toast({ variant: 'destructive', title: 'Error saving profile' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-600 border-amber-200',
    approved: 'bg-green-50 text-green-600 border-green-200',
    rejected: 'bg-red-50 text-red-600 border-red-200',
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Status banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border p-4 flex items-center gap-3 ${
          statusColors[applicationStatus] ??
          'bg-gray-50 text-gray-600 border-gray-200'
        }`}
      >
        {applicationStatus === 'approved' ? (
          <BadgeCheck className="w-6 h-6 shrink-0" />
        ) : (
          <IdCard className="w-6 h-6 shrink-0" />
        )}
        <div>
          <p className="font-semibold text-sm capitalize">
            Application {applicationStatus}
          </p>
          <p className="text-xs opacity-80">
            {applicationStatus === 'pending' &&
              'Your application is under review'}
            {applicationStatus === 'approved' &&
              'You can now accept deliveries'}
            {applicationStatus === 'rejected' && (
              <span>
                Please{' '}
                <Link to="/rider/support" className="underline font-medium">
                  contact support
                </Link>{' '}
                for details
              </span>
            )}
          </p>
        </div>
      </motion.div>

      {/* Documents */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <FileImage className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Documents</h2>
        </div>

        <div className="space-y-3">
          {DOCUMENT_FIELDS.map((doc) => (
            <div
              key={doc.key}
              className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                {documents[doc.key] ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                )}
                <span className="text-sm text-gray-700">{doc.label}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={uploading === doc.key}
                onClick={() => void handleFileUpload(doc.key)}
                className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
              >
                {uploading === doc.key ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-1" />
                )}
                {documents[doc.key] ? 'Replace' : 'Upload'}
              </Button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Payout Details */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Banknote className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Payout Details</h2>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 flex items-center gap-3">
              <Banknote className="w-6 h-6 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Mobile Money (Recommended)
                </p>
                <p className="text-xs text-gray-500">
                  Get paid instantly to your mobile wallet
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          <SelectValue placeholder="Select" />
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
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <Input placeholder="01XXXXXXXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-400">
                  Or bank transfer
                </span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="accountHolderName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Holder Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Bank name" {...field} />
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
                      <Input placeholder="Account number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </form>
        </Form>
      </motion.div>
    </div>
  );
};

export default RiderProfilePage;
