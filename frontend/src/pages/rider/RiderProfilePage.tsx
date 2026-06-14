import { PageHeader, SectionCard, StatCard, StatusBadge } from "@/components/rider";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRider } from "@/contexts/RiderContext";
import { toast } from "@/lib/toast";
import { applyServerErrors } from "@/lib/formErrors";
import { optionalBdPhoneSchema } from "@/lib/phone";
import riderService from "@/services/riderService";
import { formatCurrency } from "@/utils/format";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Banknote,
  Bike,
  CheckCircle,
  FileImage,
  Loader2,
  Star,
  Truck,
  Upload,
  Wallet,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";

const profileSchema = z.object({
  vehicleType: z.enum(["bicycle", "motorcycle", "car", "van"]).optional(),
  vehicleNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  accountHolderName: z.string().optional(),
  mobileMoneyNumber: optionalBdPhoneSchema as unknown as z.ZodOptional<z.ZodString>,
  mobileMoneyProvider: z.string().optional(),
});
type ProfileFormData = z.infer<typeof profileSchema>;

const VEHICLE_TYPES = [
  { value: "bicycle", label: "Bicycle" },
  { value: "motorcycle", label: "Motorcycle" },
  { value: "car", label: "Car" },
  { value: "van", label: "Van" },
] as const;

const MOBILE_MONEY_PROVIDERS = [
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "rocket", label: "Rocket" },
  { value: "upay", label: "Upay" },
];

const DOCUMENT_FIELDS = [
  { key: "licensePhoto", label: "Driver's license" },
  { key: "vehicleRegistrationPhoto", label: "Vehicle registration" },
  { key: "insurancePhoto", label: "Insurance document" },
] as const;

const RiderProfilePage: React.FC = () => {
  const { profile, refresh } = useRider();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Record<string, string>>({});
  const hydrated = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<string | null>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: "onTouched",
    defaultValues: {
      vehicleType: undefined,
      vehicleNumber: "",
      licenseNumber: "",
      bankName: "",
      accountNumber: "",
      accountHolderName: "",
      mobileMoneyNumber: "",
      mobileMoneyProvider: undefined,
    },
  });

  // Hydrate the form once the shared profile is available.
  useEffect(() => {
    if (!profile || hydrated.current) return;
    hydrated.current = true;
    setDocuments((profile.documents as Record<string, string>) ?? {});
    const bd = profile.bankDetails ?? {};
    form.reset({
      vehicleType: profile.vehicleType as ProfileFormData["vehicleType"],
      vehicleNumber: profile.vehicleNumber ?? "",
      licenseNumber: profile.licenseNumber ?? "",
      bankName: bd.bankName ?? "",
      accountNumber: bd.accountNumber ?? "",
      accountHolderName: bd.accountHolderName ?? "",
      mobileMoneyNumber: bd.mobileMoneyNumber ?? "",
      mobileMoneyProvider: bd.mobileMoneyProvider ?? undefined,
    });
  }, [profile, form]);

  const triggerUpload = (field: string) => {
    uploadTarget.current = field;
    fileRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const field = uploadTarget.current;
    e.target.value = "";
    if (!file || !field) return;
    setUploading(field);
    try {
      const fd = new FormData();
      fd.append("document", file);
      fd.append("documentType", field);
      const res = await riderService.uploadDocument(fd);
      const url = (res.data as { data?: { documentUrl: string } }).data
        ?.documentUrl;
      if (url) {
        setDocuments((prev) => ({ ...prev, [field]: url }));
        toast.success("Uploaded", { description: "Document saved." });
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setSaving(true);
    try {
      await riderService.updateProfile({
        vehicleType: data.vehicleType,
        vehicleNumber: data.vehicleNumber || undefined,
        licenseNumber: data.licenseNumber || undefined,
        bankDetails: {
          bankName: data.bankName || undefined,
          accountNumber: data.accountNumber || undefined,
          accountHolderName: data.accountHolderName || undefined,
          mobileMoneyNumber: data.mobileMoneyNumber || undefined,
          mobileMoneyProvider: data.mobileMoneyProvider || undefined,
        },
      });
      await refresh();
      toast.success("Saved", { description: "Profile updated." });
    } catch (err) {
      applyServerErrors(form, err, {
        fallbackMessage: "Couldn't save profile",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  const statusTone =
    profile.applicationStatus === "approved"
      ? "success"
      : profile.applicationStatus === "rejected"
        ? "danger"
        : "warning";

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Profile"
        subtitle={
          <>
            Application
            <StatusBadge
              status={profile.applicationStatus}
              tone={statusTone}
              size="sm"
            />
          </>
        }
      />

      {profile.applicationStatus === "rejected" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {profile.rejectionReason ?? "Your application was not approved."}{" "}
          <Link to="/rider/support" className="font-medium underline">
            Contact support
          </Link>
          .
        </div>
      )}

      {/* Performance */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Rating"
          value={profile.rating.count ? profile.rating.average.toFixed(1) : "—"}
          icon={Star}
          hint={`${profile.rating.count} ratings`}
        />
        <StatCard
          label="Deliveries"
          value={profile.totalDeliveries}
          icon={Truck}
        />
        <StatCard
          label="Earned"
          value={formatCurrency(profile.totalEarnings)}
          icon={Wallet}
          accent="brand"
        />
      </div>

      {/* Documents */}
      <SectionCard
        title="Documents"
        icon={<FileImage className="h-4 w-4 text-muted-foreground" />}
      >
        <div className="space-y-2">
          {DOCUMENT_FIELDS.map((doc) => (
            <div
              key={doc.key}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div className="flex items-center gap-3">
                {documents[doc.key] ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                ) : (
                  <span className="h-5 w-5 rounded-full border-2 border-muted-foreground/40" />
                )}
                <span className="text-sm text-foreground">{doc.label}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={uploading === doc.key}
                onClick={() => triggerUpload(doc.key)}
                className="text-brand-600 hover:text-brand-700"
              >
                {uploading === doc.key ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-1 h-4 w-4" />
                )}
                {documents[doc.key] ? "Replace" : "Upload"}
              </Button>
            </div>
          ))}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
      </SectionCard>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Vehicle & license */}
          <SectionCard
            title="Vehicle & license"
            icon={<Bike className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="vehicleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {VEHICLE_TYPES.map((v) => (
                          <SelectItem key={v.value} value={v.value}>
                            {v.label}
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
                name="vehicleNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. DHA-12-3456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="licenseNumber"
              render={({ field }) => (
                <FormItem className="mt-3">
                  <FormLabel>License number</FormLabel>
                  <FormControl>
                    <Input placeholder="License number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SectionCard>

          {/* Payout */}
          <SectionCard
            title="Payout details"
            icon={<Banknote className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="mobileMoneyProvider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile money provider</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
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
                    <FormLabel>Mobile number</FormLabel>
                    <FormControl>
                      <Input placeholder="01XXXXXXXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-2 text-xs uppercase text-muted-foreground">
                  or bank transfer
                </span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="accountHolderName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account holder name</FormLabel>
                  <FormControl>
                    <Input placeholder="Full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank name</FormLabel>
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
                    <FormLabel>Account number</FormLabel>
                    <FormControl>
                      <Input placeholder="Account number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </SectionCard>

          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default RiderProfilePage;
