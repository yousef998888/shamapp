import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Store, Package, Clock, Phone, Mail } from 'lucide-react';
import { PickupLocation, City, CreatePickupLocationData, UpdatePickupLocationData, supabase } from '@/lib/supabase';

const locationSchema = z.object({
  city_id: z.string().min(1, 'City is required'),
  name: z.string().min(1, 'Name is required'),
  name_ar: z.string().optional(),
  address: z.string().min(1, 'Address is required'),
  address_ar: z.string().optional(),
  postal_code: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  latitude: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
  type: z.string().min(1, 'Type is required'),
  pickup_fee: z.number().min(0, 'Pickup fee must be 0 or greater').default(0),
  estimated_days: z.number().min(1, 'Estimated days must be at least 1').default(1),
  special_instructions: z.string().optional(),
  special_instructions_ar: z.string().optional(),
  is_active: z.boolean().default(true),
  display_order: z.number().default(0),
});

type LocationFormData = z.infer<typeof locationSchema>;

interface LocationFormProps {
  location?: PickupLocation | null;
  onClose: () => void;
  onSubmit: () => void;
}

const LOCATION_TYPES = [
  { value: 'branch', label: 'Branch Store', icon: Store },
  { value: 'pickup_point', label: 'Pickup Point', icon: Package },
  { value: 'warehouse', label: 'Warehouse', icon: Package },
  { value: 'partner_store', label: 'Partner Store', icon: Store },
];

const DAYS_OF_WEEK = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

export function LocationForm({ location, onClose, onSubmit }: LocationFormProps) {
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [operatingHours, setOperatingHours] = useState<{[key: string]: string}>({});

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      city_id: location?.city_id || '',
      name: location?.name || '',
      name_ar: location?.name_ar || '',
      address: location?.address || '',
      address_ar: location?.address_ar || '',
      postal_code: location?.postal_code || '',
      phone: location?.phone || '',
      email: location?.email || '',
      latitude: location?.latitude || 0,
      longitude: location?.longitude || 0,
      type: location?.type || 'pickup_point',
      pickup_fee: location?.pickup_fee || 0,
      estimated_days: location?.estimated_days || 1,
      special_instructions: location?.special_instructions || '',
      special_instructions_ar: location?.special_instructions_ar || '',
      is_active: location?.is_active ?? true,
      display_order: location?.display_order || 0,
    },
  });

  useEffect(() => {
    fetchCities();
    if (location?.operating_hours) {
      setOperatingHours(location.operating_hours);
    }
  }, [location]);

  const fetchCities = async () => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('id, name, name_ar, country')
        .eq('is_active', true)
        .order('display_order');

      if (error) {
        console.error('Error fetching cities:', error);
        return;
      }

      setCities((data || []) as City[]);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleOperatingHoursChange = (day: string, hours: string) => {
    setOperatingHours(prev => ({
      ...prev,
      [day]: hours
    }));
  };

  const handleSubmit = async (data: LocationFormData) => {
    try {
      setLoading(true);
      
      const submitData = {
        ...data,
        operating_hours: Object.keys(operatingHours).length > 0 ? operatingHours : undefined,
      };

      if (location) {
        // Update existing location
        const updateData: UpdatePickupLocationData = {
          id: location.id,
          ...submitData,
        };

        const { error } = await supabase
          .from('pickup_locations')
          .update(updateData)
          .eq('id', location.id);

        if (error) {
          console.error('Error updating location:', error);
          return;
        }
      } else {
        // Create new location
        const createData: CreatePickupLocationData = { ...submitData };
        
        const { error } = await supabase
          .from('pickup_locations')
          .insert(createData);

        if (error) {
          console.error('Error creating location:', error);
          return;
        }
      }

      onSubmit();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedLocationType = LOCATION_TYPES.find(type => type.value === form.watch('type'));

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedLocationType && <selectedLocationType.icon className="h-5 w-5" />}
            {location ? 'Edit Location' : 'Add Location'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="location">Location Details</TabsTrigger>
                <TabsTrigger value="operating">Operating Hours</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* City Selection */}
                  <FormField
                    control={form.control}
                    name="city_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a city" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cities.map((city) => (
                              <SelectItem key={city.id} value={city.id}>
                                {city.name} {city.name_ar && `(${city.name_ar})`} - {city.country}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Location Type */}
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select location type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {LOCATION_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center gap-2">
                                  <type.icon className="h-4 w-4" />
                                  {type.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* English Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name (English)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter location name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Arabic Name */}
                  <FormField
                    control={form.control}
                    name="name_ar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name (Arabic)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="أدخل اسم الموقع"
                            dir="rtl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pickup Fee */}
                  <FormField
                    control={form.control}
                    name="pickup_fee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pickup Fee</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            min="0"
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Estimated Days */}
                  <FormField
                    control={form.control}
                    name="estimated_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Days</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="1"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            placeholder="1"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Display Order */}
                  <FormField
                    control={form.control}
                    name="display_order"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Order</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Active Status */}
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Make this location visible to users
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="location" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* English Address */}
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address (English)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Enter full address"
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Arabic Address */}
                  <FormField
                    control={form.control}
                    name="address_ar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address (Arabic)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="أدخل العنوان الكامل"
                            rows={3}
                            dir="rtl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Postal Code */}
                  <FormField
                    control={form.control}
                    name="postal_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="12345"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Phone */}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Phone
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="+1234567890"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Email */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="location@example.com"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Coordinates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Latitude */}
                      <FormField
                        control={form.control}
                        name="latitude"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Latitude</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                step="any"
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                placeholder="33.5138"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Longitude */}
                      <FormField
                        control={form.control}
                        name="longitude"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Longitude</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                step="any"
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                placeholder="36.2765"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Special Instructions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="special_instructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Instructions (English)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Any special instructions for customers"
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="special_instructions_ar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Instructions (Arabic)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="أي تعليمات خاصة للعملاء"
                            rows={3}
                            dir="rtl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="operating" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Operating Hours
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {DAYS_OF_WEEK.map((day) => (
                        <div key={day} className="flex items-center gap-4">
                          <Label className="w-24 capitalize text-sm font-medium">
                            {day}
                          </Label>
                          <Input
                            value={operatingHours[day] || ''}
                            onChange={(e) => handleOperatingHoursChange(day, e.target.value)}
                            placeholder="9:00 AM - 6:00 PM"
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : (location ? 'Update Location' : 'Create Location')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
