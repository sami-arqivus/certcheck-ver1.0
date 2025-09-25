import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2, Mail, Send, CalendarIcon, MapPin, Briefcase, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  position: z.string().min(2, { message: "Position must be at least 2 characters." }),
  workLocation: z.string().min(2, { message: "Work location must be at least 2 characters." }),
  startDate: z.date({ required_error: "Please select a start date." }),
});

type FormData = z.infer<typeof formSchema>;

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddEmployee: (employeeData: FormData) => Promise<void>;
}

export const AddEmployeeDialog: React.FC<AddEmployeeDialogProps> = ({
  open,
  onOpenChange,
  onAddEmployee,
}) => {
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      position: '',
      workLocation: '',
    },
  });

  const handleSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      await onAddEmployee(data);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding employee:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!loading) {
      onOpenChange(newOpen);
      if (!newOpen) {
        form.reset();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card border-border shadow-admin-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center text-foreground">
            <User className="w-5 h-5 mr-2 text-admin-accent" />
            Add New Employee
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter the employee details to add them to CertCheck.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name Field */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Full Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John Doe"
                        {...field}
                        disabled={loading}
                        className="bg-background border-border focus:border-admin-accent focus:ring-admin-accent/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email Field */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      Email Address
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john.doe@company.com"
                        {...field}
                        disabled={loading}
                        className="bg-background border-border focus:border-admin-accent focus:ring-admin-accent/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Position Field */}
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <Briefcase className="w-4 h-4 mr-2" />
                      Position
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Software Engineer"
                        {...field}
                        disabled={loading}
                        className="bg-background border-border focus:border-admin-accent focus:ring-admin-accent/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Work Location Field */}
              <FormField
                control={form.control}
                name="workLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      Work Location
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="New York, NY"
                        {...field}
                        disabled={loading}
                        className="bg-background border-border focus:border-admin-accent focus:ring-admin-accent/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Start Date Field */}
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Start Date
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal bg-background border-border",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={loading}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a start date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date("1900-01-01")}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}                     
                disabled={loading}
                className="border-border hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                type="submit"                                              // Button to submit the form
                disabled={loading}
                className="bg-gradient-primary hover:opacity-90 text-white shadow-admin-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding Employee...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Add Employee
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};