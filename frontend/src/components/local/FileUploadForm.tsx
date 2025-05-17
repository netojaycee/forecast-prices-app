"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { useState } from "react";
import { ChartLine, Loader2 } from "lucide-react";

const formSchema = z.object({
  file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 5 * 1024 * 1024,
      "File size must be less than 5MB"
    )
    .refine(
      (file) =>
        [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
        ].includes(file.type),
      "File must be an Excel file (.xlsx or .xls)"
    ),
});

interface FileUploadFormProps {
  onPrediction: (data: { location: string; price: number }[]) => void;
}

export default function FileUploadForm({ onPrediction }: FileUploadFormProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    const formData = new FormData();
    formData.append("file", values.file);

    try {
      const response = await fetch("http://localhost:8000/predict", {
        // Update to FastAPI endpoint
        method: "POST",
        body: formData,
      });
      setLoading(false);
      if (!response.ok) {
        throw new Error("Failed to process file");
      }

      const data = await response.json();
      onPrediction(data.predictions);
      toast.success("Success", {
        description: "File processed successfully!",
      });
    } catch (error: any) {
      setLoading(false);
      console.error(error);
      toast.error("Error", {
        description: "Failed to process file. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
        <FormField
          control={form.control}
          name='file'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Upload Excel File</FormLabel>
              <FormControl>
                <Input
                  type='file'
                  accept='.xlsx,.xls'
                  onChange={(e) => field.onChange(e.target.files?.[0])}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type='submit'
          disabled={loading}
          className='w-full flex items-center justify-center gap-2'
        >
          {loading ? (
            <>
              <Loader2 className='h-5 w-5 animate-spin' />
              <span>Please wait</span>
            </>
          ) : (
            <>
              <span>Predict Prices</span>
              <ChartLine className='h-6 w-6' />
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
