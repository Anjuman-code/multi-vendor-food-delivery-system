import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Store } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import {
  AuthHeading,
  PasswordInput,
  PasswordStrengthMeter,
  StepProgress,
  SubmitButton,
} from "@/components/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRedirectIfAuthenticated } from "@/hooks/useAuthRedirect";
import { useToast } from "@/hooks/use-toast";
import { vendorRegisterSchema, type VendorRegisterFormData } from "@/lib/validation";
import authService from "@/services/authService";

const STEPS = [{ label: "Account" }, { label: "Business" }];

const STEP_0_FIELDS: (keyof VendorRegisterFormData)[] = [
  "firstName",
  "lastName",
  "email",
  "phoneNumber",
  "password",
  "confirmPassword",
];

const stepTransition = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
  transition: { duration: 0.22 },
};

const VendorRegisterPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawStep = searchParams.get("step");
  const step = rawStep === "business" ? 1 : 0;
  const setStep = (n: number) =>
    setSearchParams({ step: n === 0 ? "account" : "business" }, { replace: true });

  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useRedirectIfAuthenticated();

  useEffect(() => {
    if (!rawStep) setSearchParams({ step: "account" }, { replace: true });
  }, [rawStep, setSearchParams]);

  const form = useForm<VendorRegisterFormData>({
    resolver: zodResolver(vendorRegisterSchema),
    mode: "onTouched",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
      businessName: "",
      businessLicense: "",
      taxId: "",
      agreedToTerms: false,
    },
  });

  const password = form.watch("password");

  const handleNext = async () => {
    if (await form.trigger(STEP_0_FIELDS)) setStep(1);
  };

  const onSubmit = async (data: VendorRegisterFormData) => {
    setIsLoading(true);
    try {
      const response = await authService.registerVendor({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        password: data.password,
        businessName: data.businessName,
        businessLicense: data.businessLicense,
        taxId: data.taxId,
      });

      if (response.success) {
        toast({
          title: "Application submitted!",
          description: "Check your email to verify your account.",
        });
        navigate("/verify-email", { state: { email: data.email } });
      } else {
        toast({
          title: "Registration failed",
          description: response.message || "Please check your details and try again.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Something went wrong",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthHeading
        icon={Store}
        eyebrow="Vendor application"
        title="Become a partner"
        subtitle="Reach thousands of hungry customers across Sylhet."
      />

      <StepProgress steps={STEPS} current={step} onStepClick={setStep} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <AnimatePresence mode="wait" initial={false}>
            {step === 0 ? (
              <motion.div key="account" {...stepTransition} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First name</FormLabel>
                        <FormControl>
                          <Input autoComplete="given-name" placeholder="First name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last name</FormLabel>
                        <FormControl>
                          <Input autoComplete="family-name" placeholder="Last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone number</FormLabel>
                      <FormControl>
                        <Input type="tel" autoComplete="tel" placeholder="+8801XXXXXXXXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <PasswordInput autoComplete="new-password" placeholder="Create a strong password" {...field} />
                      </FormControl>
                      <PasswordStrengthMeter password={password} />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm password</FormLabel>
                      <FormControl>
                        <PasswordInput autoComplete="new-password" placeholder="Re-enter your password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="button" variant="brand" size="lg" onClick={handleNext} className="mt-2 w-full">
                  Continue
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </motion.div>
            ) : (
              <motion.div key="business" {...stepTransition} className="space-y-4">
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business / restaurant name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Sylheti Kitchen" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessLicense"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business license number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. BL-2024-XXXXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax ID / TIN</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. TIN-XXXXXXXXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="agreedToTerms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-1">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal text-muted-foreground">
                          I agree to the{" "}
                          <Link to="/terms" className="font-medium text-brand-600 hover:text-brand-700">
                            Terms
                          </Link>
                          ,{" "}
                          <Link to="/privacy" className="font-medium text-brand-600 hover:text-brand-700">
                            Privacy Policy
                          </Link>{" "}
                          and Vendor Partner Agreement
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="outline" size="lg" onClick={() => setStep(0)} className="flex-1">
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Back
                  </Button>
                  <SubmitButton loading={isLoading} loadingText="Submitting…" className="flex-1">
                    Submit application
                  </SubmitButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </Form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-brand-600 transition-colors hover:text-brand-700">
          Log in
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Want to order food instead?{" "}
        <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700">
          Create a customer account
        </Link>
      </p>
    </>
  );
};

export default VendorRegisterPage;
