import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Bike } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRedirectIfAuthenticated } from "@/hooks/useAuthRedirect";
import { applyServerErrors } from "@/lib/formErrors";
import { toast } from "@/lib/toast";
import { riderRegisterSchema, type RiderRegisterFormData } from "@/lib/validation";
import authService from "@/services/authService";

const STEPS = [{ label: "Account" }, { label: "Vehicle" }];

const VEHICLE_TYPES = [
  { value: "bicycle", label: "Bicycle" },
  { value: "motorcycle", label: "Motorcycle" },
  { value: "car", label: "Car" },
  { value: "van", label: "Van" },
  { value: "truck", label: "Truck" },
];

const STEP_0_FIELDS: (keyof RiderRegisterFormData)[] = [
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

const RiderRegisterPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawStep = searchParams.get("step");
  const step = rawStep === "vehicle" ? 1 : 0;
  const setStep = (n: number) =>
    setSearchParams({ step: n === 0 ? "account" : "vehicle" }, { replace: true });

  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useRedirectIfAuthenticated();

  useEffect(() => {
    if (!rawStep) setSearchParams({ step: "account" }, { replace: true });
  }, [rawStep, setSearchParams]);

  const form = useForm<RiderRegisterFormData>({
    resolver: zodResolver(riderRegisterSchema),
    mode: "onTouched",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
      licenseNumber: "",
      vehicleType: undefined,
      vehicleNumber: "",
      agreedToTerms: false,
    },
  });

  const password = form.watch("password");

  const handleNext = async () => {
    if (await form.trigger(STEP_0_FIELDS)) setStep(1);
  };

  const onSubmit = async (data: RiderRegisterFormData) => {
    setIsLoading(true);
    try {
      const response = await authService.registerDriver({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        password: data.password,
        licenseNumber: data.licenseNumber,
        vehicleType: data.vehicleType,
        vehicleNumber: data.vehicleNumber,
      });

      if (response.success) {
        toast.success("Application submitted!", {
          description: "Verify your email, then wait for admin approval before you start delivering.",
        });
        navigate("/verify-email", { state: { email: data.email } });
      } else {
        applyServerErrors(form, response);
        if (STEP_0_FIELDS.some((f) => form.getFieldState(f).error)) setStep(0);
      }
    } catch (err) {
      applyServerErrors(form, err);
      if (STEP_0_FIELDS.some((f) => form.getFieldState(f).error)) setStep(0);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthHeading
        icon={Bike}
        eyebrow="Rider application"
        title="Become a rider"
        subtitle="Join Food Rush and earn on your own schedule."
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
              <motion.div key="vehicle" {...stepTransition} className="space-y-4">
                <FormField
                  control={form.control}
                  name="licenseNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Driver&apos;s license number</FormLabel>
                      <FormControl>
                        <Input placeholder="DL-XXXX-XXXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vehicleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vehicle type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {VEHICLE_TYPES.map((vt) => (
                            <SelectItem key={vt.value} value={vt.value}>
                              {vt.label}
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
                      <FormLabel>Vehicle registration number</FormLabel>
                      <FormControl>
                        <Input placeholder="DHK-XX-XXXX" {...field} />
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
                          </Link>{" "}
                          and{" "}
                          <Link to="/privacy" className="font-medium text-brand-600 hover:text-brand-700">
                            Privacy Policy
                          </Link>
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
    </>
  );
};

export default RiderRegisterPage;
