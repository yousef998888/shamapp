import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Edit, 
  Trash2,
  Eye,
  EyeOff,
  MapPin,
  Store,
  Package,
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { PickupLocation, City, supabase } from '@/lib/supabase';
import { LocationForm } from './LocationForm';
import { DeleteLocationDialog } from './DeleteLocationDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function LocationList() {
  const [locations, setLocations] = useState<PickupLocation[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<PickupLocation | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<PickupLocation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchLocations();
    fetchCities();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pickup_locations')
        .select(`
          *,
          city:cities(id, name, name_ar, country)
        `)
        .order('display_order');

      if (error) {
        console.error('Error fetching locations:', error);
        return;
      }

      setLocations(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async () => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('id, name, name_ar, country')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching cities:', error);
        return;
      }

      setCities((data || []) as City[]);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleAddLocation = () => {
    setEditingLocation(null);
    setShowForm(true);
  };

  const handleEditLocation = (location: PickupLocation) => {
    setEditingLocation(location);
    setShowForm(true);
  };

  const handleDeleteLocation = (location: PickupLocation) => {
    setDeletingLocation(location);
  };

  const handleToggleStatus = async (location: PickupLocation) => {
    try {
      const { error } = await supabase
        .from('pickup_locations')
        .update({ is_active: !location.is_active })
        .eq('id', location.id);

      if (error) {
        console.error('Error updating location status:', error);
        return;
      }

      // Update local state
      setLocations(prev => 
        prev.map(loc => 
          loc.id === location.id 
            ? { ...loc, is_active: !loc.is_active }
            : loc
        )
      );
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getLocationTypeIcon = (type: string) => {
    switch (type) {
      case 'branch':
        return <Store className="h-4 w-4" />;
      case 'pickup_point':
      case 'warehouse':
        return <Package className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const getLocationTypeLabel = (type: string) => {
    switch (type) {
      case 'branch':
        return 'Branch Store';
      case 'pickup_point':
        return 'Pickup Point';
      case 'warehouse':
        return 'Warehouse';
      case 'partner_store':
        return 'Partner Store';
      default:
        return type;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
    }).format(price);
  };

  // Filter locations based on search and filters
  const filteredLocations = locations.filter(location => {
    const matchesSearch = 
      location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (location.city?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCity = selectedCity === 'all' || location.city_id === selectedCity;
    const matchesType = selectedType === 'all' || location.type === selectedType;
    
    return matchesSearch && matchesCity && matchesType;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredLocations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLocations = filteredLocations.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCity, selectedType]);

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleItemsPerPageChange = (newItemsPerPage: string) => {
    setItemsPerPage(Number(newItemsPerPage));
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading locations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pickup Locations</h1>
          <p className="text-muted-foreground">
            Manage pickup locations and delivery points
          </p>
        </div>
        <Button onClick={handleAddLocation} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Location
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.name} - {city.country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="branch">Branch Store</SelectItem>
                <SelectItem value="pickup_point">Pickup Point</SelectItem>
                <SelectItem value="warehouse">Warehouse</SelectItem>
                <SelectItem value="partner_store">Partner Store</SelectItem>
              </SelectContent>
            </Select>
            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 per page</SelectItem>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Locations Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Locations ({filteredLocations.length})
            </CardTitle>
            {filteredLocations.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredLocations.length)} of {filteredLocations.length} results
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredLocations.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No locations found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedCity !== 'all' || selectedType !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first pickup location'
                }
              </p>
              {!searchTerm && selectedCity === 'all' && selectedType === 'all' && (
                <Button onClick={handleAddLocation}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLocations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{location.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {location.address}
                        </div>
                        {location.phone && (
                          <div className="text-xs text-muted-foreground">
                            📞 {location.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{location.city?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {location.city?.country}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        {getLocationTypeIcon(location.type)}
                        {getLocationTypeLabel(location.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {location.pickup_fee > 0 ? formatPrice(location.pickup_fee) : 'Free'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {location.estimated_days} day{location.estimated_days !== 1 ? 's' : ''}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={location.is_active ? 'default' : 'secondary'}>
                        {location.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditLocation(location)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(location)}>
                            {location.is_active ? (
                              <>
                                <EyeOff className="h-4 w-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteLocation(location)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {/* Pagination Controls */}
          {filteredLocations.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                {/* Page numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Forms and Dialogs */}
      {showForm && (
        <LocationForm
          location={editingLocation}
          onClose={() => {
            setShowForm(false);
            setEditingLocation(null);
          }}
          onSubmit={() => {
            setShowForm(false);
            setEditingLocation(null);
            fetchLocations();
          }}
        />
      )}

      {deletingLocation && (
        <DeleteLocationDialog
          location={deletingLocation}
          onClose={() => setDeletingLocation(null)}
          onConfirm={() => {
            setDeletingLocation(null);
            fetchLocations();
          }}
        />
      )}
    </div>
  );
}
