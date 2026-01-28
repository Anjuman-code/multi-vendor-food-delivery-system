import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ZodTypeAny } from "zod";

import { cn } from "@/utils/cn";

interface FormProps<T extends Record<string, any>> {
  className?: string;
  onSubmit: (data: T) => void;
  children: React.ReactNode;
  schema?: ZodTypeAny;
  defaultValues?: Partial<T>;
}

function Form<T extends Record<string, any>>({
  className,
  onSubmit,
  children,
  schema,
  defaultValues,
}: FormProps<T>) {
  const form = useForm<T>({
    resolver: schema ? zodResolver(schema) : undefined,
    defaultValues,
  });

  const handleSubmit = (data: T) => {
    onSubmit(data);
  };

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className={cn(className)}
    >
      {typeof children === "function" ? children(form) : children}
    </form>
  );
}

export { Form, useForm };