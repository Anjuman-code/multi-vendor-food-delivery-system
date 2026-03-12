import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Store, ChevronRight, ChevronLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  vendorRegisterSchema,
  type VendorRegisterFormData,
} from "../lib/validation";
import authService from "../services/authService";

const STEPS = [
  { label: "Account", description: "Personal details & login" },
  { label: "Business", description: "Your restaurant business info" },
];

const VendorRegisterPage: React.FC = () => {
  const [step, setStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const form = useForm<VendorRegisterFormData>({
    resolver: zodResolver(vendorRegisterSchema),
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
    mode: "onTouched",
  });

  const {
    trigger,
    formState: { errors },
  } = form;

  const handleNext = async () => {
    const step0Fields: (keyof VendorRegisterFormData)[] = [
      "firstName",
      "lastName",
      "email",
      "phoneNumber",
      "password",
      "confirmPassword",
    ];
    const valid = await trigger(step0Fields);
    if (valid) setStep(1);
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
          description: "Please check your email to verify your account.",
        });
        navigate("/verify-email", { state: { email: data.email } });
      } else {
        toast({
          title: "Registration failed",
          description:
            response.message || "Please check your details and try again.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shrink-0">
            <Store className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
            Vendor Application
          </span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">
          Become a Partner
        </h2>
        <p className="text-gray-600 text-sm">
          Reach thousands of hungry customers in Sylhet.
        </p>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <React.Fragment key={i}>
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-2 ${i < step ? "cursor-pointer" : "cursor-default"}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i === step
                    ? "bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-sm"
                    : i < step
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-400"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span
                className={`text-sm font-medium hidden sm:block ${
                  i === step
                    ? "text-gray-900"
                    : i < step
                      ? "text-green-600"
                      : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px ${i < step ? "bg-green-400" : "bg-gray-200"}`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="First name"
                            {...field}
                            className={errors.firstName ? "border-red-500" : ""}
                          />
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
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Last name"
                            {...field}
                            className={errors.lastName ? "border-red-500" : ""}
                          />
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
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          {...field}
                          className={errors.email ? "border-red-500" : ""}
                        />
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
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+8801XXXXXXXXX"
                          {...field}
                          className={errors.phoneNumber ? "border-red-500" : ""}
                        />
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
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a strong password"
                            className={`${errors.password ? "border-red-500" : ""} pr-10`}
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            className={`${errors.confirmPassword ? "border-red-500" : ""} pr-10`}
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  onClick={handleNext}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold h-11 mt-2"
                >
                  Continue
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business / Restaurant Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Sylheti Kitchen"
                          {...field}
                          className={
                            errors.businessName ? "border-red-500" : ""
                          }
                        />
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
                      <FormLabel>Business License Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. BL-2024-XXXXX"
                          {...field}
                          className={
                            errors.businessLicense ? "border-red-500" : ""
                          }
                        />
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
                        <Input
                          placeholder="e.g. TIN-XXXXXXXXX"
                          {...field}
                          className={errors.taxId ? "border-red-500" : ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="agreedToTerms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-0.5"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">
                          I agree to the{" "}
                          <Link
                            to="/terms"
                            className="text-orange-500 hover:text-orange-600"
                          >
                            Terms & Privacy Policy
                          </Link>{" "}
                          and the{" "}
                          <Link
                            to="/terms"
                            className="text-orange-500 hover:text-orange-600"
                          >
                            Vendor Partner Agreement
                          </Link>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(0)}
                    className="flex-1 h-11"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold h-11"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="animate-spin h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Submitting…
                      </span>
                    ) : (
                      "Submit Application"
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </Form>

      {/* Footer links */}
      <p className="text-center text-sm text-gray-500 mt-6">
        Already have a vendor account?{" "}
        <Link
          to="/login"
          className="font-medium text-orange-500 hover:text-orange-600"
        >
          Log in
        </Link>
      </p>
      <p className="text-center text-sm text-gray-500 mt-2">
        Want to order food instead?{" "}
        <Link
          to="/register"
          className="font-medium text-orange-500 hover:text-orange-600"
        >
          Create a customer account
        </Link>
      </p>
    </>
  );
};

export default VendorRegisterPage;
