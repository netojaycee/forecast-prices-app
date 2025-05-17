"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { format, toZonedTime as utcToZonedTime } from "date-fns-tz";
import { CalendarIcon, EqualApproximately, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { isBefore, startOfDay } from "date-fns";

const timeZone = "Africa/Lagos"; // GMT+1 (WAT)

const formSchema = z.object({
  location: z.string().nonempty("Location is required"),
  date: z.date().refine((date) => {
    const zonedDate = utcToZonedTime(date, timeZone);
    const today = startOfDay(utcToZonedTime(new Date(), timeZone));
    return !isBefore(zonedDate, today);
  }, "Date must be today or in the future (GMT+1)"),
  cpi_food_items: z
    .number()
    .min(0, "CPI must be positive")
    .max(10000, "CPI too high"),
  pms_price: z
    .number()
    .min(0, "PMS Price must be positive")
    .max(10000, "PMS Price too high"),
  central_rate_usd: z
    .number()
    .min(0, "USD Rate must be positive")
    .max(10000, "USD Rate too high"),
  mpr: z.number().min(0, "MPR must be positive").max(100, "MPR too high"),
});

export default function PredictSingle() {
  const [prediction, setPrediction] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      location: "",
      date: utcToZonedTime(new Date(), timeZone),
      cpi_food_items: 0,
      pms_price: 0,
      central_rate_usd: 0,
      mpr: 0,
    },
  });

  useEffect(() => {
    if (prediction !== null && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [prediction]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: values.location,
          date: format(values.date, "yyyy-MM-dd", { timeZone }),
          cpi_food_items: values.cpi_food_items,
          pms_price: values.pms_price,
          central_rate_usd: values.central_rate_usd,
          mpr: values.mpr,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch prediction");
      }

      const data = await response.json();
      setPrediction(data.price);
      toast.success("Success", {
        description: "Prediction generated successfully!",
      });
    } catch (error: any) {
      console.error(error);
      toast.error("Error", {
        description: "Failed to generate prediction. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4'>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className='w-full max-w-5xl'
      >
        <Card className='shadow-lg'>
          <CardHeader>
            <CardTitle className='text-2xl font-bold text-center'>
              Predict Wheat Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid md:grid-cols-3 gap-6'>
              {/* Form */}
              <div className='md:col-span-2'>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className='space-y-6'
                  >
                    <FormField
                      control={form.control}
                      name='location'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder='Select a location' />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value='Lagos'>Lagos</SelectItem>
                              <SelectItem value='Abuja'>Abuja</SelectItem>
                              <SelectItem value='Anambra'>Anambra</SelectItem>
                              <SelectItem value='Kano'>Kano</SelectItem>
                              <SelectItem value='Rivers'>Rivers</SelectItem>
                              <SelectItem value='Oyo'>Oyo</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='date'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date (GMT+1)</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant='outline'
                                  className='w-full justify-start text-left font-normal'
                                >
                                  <CalendarIcon className='mr-2 h-4 w-4' />
                                  {field.value ? (
                                    format(field.value, "PPP", { timeZone })
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className='w-auto p-0'>
                              <Calendar
                                mode='single'
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  isBefore(
                                    utcToZonedTime(date, timeZone),
                                    startOfDay(
                                      utcToZonedTime(new Date(), timeZone)
                                    )
                                  )
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='cpi_food_items'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPI Food Items</FormLabel>
                          <FormControl>
                            <Input
                              type='number'
                              step='0.01'
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='pms_price'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PMS Price (Petrol)</FormLabel>
                          <FormControl>
                            <Input
                              type='number'
                              step='0.01'
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='central_rate_usd'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Central Rate (USD)</FormLabel>
                          <FormControl>
                            <Input
                              type='number'
                              step='0.01'
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='mpr'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monetary Policy Rate (%)</FormLabel>
                          <FormControl>
                            <Input
                              type='number'
                              step='0.01'
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type='submit'
                      disabled={isLoading}
                      className='w-full flex items-center justify-center gap-2'
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className='h-5 w-5 animate-spin' />
                          <span>Please wait</span>
                        </>
                      ) : (
                        <>
                          <span>Predict Price</span>
                          <EqualApproximately className='h-5 w-5' />
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
              {/* Parameter Explanations */}
              <div className='md:col-span-1'>
                <Card className='bg-gray-50'>
                  <CardHeader>
                    <CardTitle className='text-lg'>Input Parameters</CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div>
                      <h3 className='font-semibold'>Location</h3>
                      <p className='text-sm text-gray-600'>
                        The Nigerian city where the wheat price is predicted
                        (e.g., Lagos, Abuja).
                      </p>
                    </div>
                    <div>
                      <h3 className='font-semibold'>Date</h3>
                      <p className='text-sm text-gray-600'>
                        The future date for the prediction in YYYY-MM-DD format
                        (GMT+1 timezone).
                      </p>
                    </div>
                    <div>
                      <h3 className='font-semibold'>CPI Food Items</h3>
                      <p className='text-sm text-gray-600'>
                        Consumer Price Index for food items, reflecting food
                        inflation.
                      </p>
                    </div>
                    <div>
                      <h3 className='font-semibold'>PMS Price (Petrol)</h3>
                      <p className='text-sm text-gray-600'>
                        Price of Premium Motor Spirit (petrol) in Naira per
                        liter.
                      </p>
                    </div>
                    <div>
                      <h3 className='font-semibold'>Central Rate (USD)</h3>
                      <p className='text-sm text-gray-600'>
                        Official exchange rate of USD to Naira set by the
                        Central Bank.
                      </p>
                    </div>
                    <div>
                      <h3 className='font-semibold'>
                        Monetary Policy Rate (%)
                      </h3>
                      <p className='text-sm text-gray-600'>
                        Interest rate set by the Central Bank to control money
                        supply.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            {prediction !== null && (
              <motion.div
                ref={resultRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className='mt-8'
              >
                <Card className='bg-gradient-to-r from-blue-500 to-purple-500 text-white'>
                  <CardHeader>
                    <CardTitle className='text-xl'>
                      Predicted Wheat Price
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className='text-3xl font-bold'>
                      ₦{prediction.toFixed(2)}
                    </p>
                    <p className='text-sm mt-2'>
                      For {form.getValues("location")} on{" "}
                      {format(form.getValues("date"), "PPP", { timeZone })}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
