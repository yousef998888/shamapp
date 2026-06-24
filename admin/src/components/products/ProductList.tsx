import React, { useState, useEffect, useMemo } from 'react';
import {
  ColumnDef,
  SortingState,
  PaginationState,
  RowSelectionState,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { 
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  MoreHorizontal,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ProductStatus = 'active' | 'inactive' | 'sold' | 'removed' | 'draft';

interface Product {
  id: string;
  title: string;
  status: ProductStatus;
  price: number;
  currency: string;
  created_at: string;
  updated_at: string;
  condition: string | null;
  description: string | null;
  location: string | null;
  is_negotiable: boolean | null;
  tags: string[] | null;
  seller_id: string;
  seller?: {
    id: string;
    username: string | null;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  images?: Array<{
    image_url: string | null;
    alt_text?: string | null;
  }> | null;
}

export function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProductStatus>('all');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedBulkStatus, setSelectedBulkStatus] = useState<ProductStatus | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          title,
          status,
          price,
          currency,
          created_at,
          updated_at,
          condition,
          description,
          location,
          is_negotiable,
          tags,
          seller_id,
          seller:users!products_seller_id_fkey(id, username, full_name, email, avatar_url),
          images:product_images(image_url, alt_text)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        toast.error('Failed to fetch products');
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (productId: string, newStatus: ProductStatus) => {
    setUpdatingStatusId(productId);
    try {
      const timestamp = new Date().toISOString();
      const { error } = await supabase
        .from('products')
        .update({
          status: newStatus,
          updated_at: timestamp,
        })
        .eq('id', productId);

      if (error) {
        throw error;
      }

      // Update local state
      setProducts((prev) =>
        prev.map((product) =>
          product.id === productId
            ? { ...product, status: newStatus, updated_at: timestamp }
            : product
        )
      );

      toast.success(`Product status changed to ${newStatus}`);
    } catch (error) {
      console.error('Failed to update product status:', error);
      toast.error('Failed to update product status');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleBulkStatusChange = async () => {
    if (!selectedBulkStatus) return;

    const selectedIds = Object.keys(rowSelection).filter(key => rowSelection[key]);
    
    if (selectedIds.length === 0) {
      return;
    }

    setBulkActionLoading(true);
    try {
      const timestamp = new Date().toISOString();
      const { error } = await supabase
        .from('products')
        .update({
          status: selectedBulkStatus,
          updated_at: timestamp,
        })
        .in('id', selectedIds);

      if (error) {
        throw error;
      }

      // Update local state
      setProducts((prev) =>
        prev.map((product) =>
          selectedIds.includes(product.id)
            ? { ...product, status: selectedBulkStatus, updated_at: timestamp }
            : product
        )
      );

      setRowSelection({});
      setBulkStatusDialogOpen(false);
      setSelectedBulkStatus(null);
      toast.success(`Successfully updated ${selectedIds.length} product(s) to ${selectedBulkStatus}`);
    } catch (error) {
      console.error('Failed to update product statuses:', error);
      toast.error('Failed to update product statuses');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    const selectedIds = Object.keys(rowSelection).filter(key => rowSelection[key]);
    
    if (selectedIds.length === 0) {
      return;
    }

    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', selectedIds);

      if (error) {
        throw error;
      }

      // Update local state
      setProducts((prev) => prev.filter((product) => !selectedIds.includes(product.id)));

      setRowSelection({});
      setBulkDeleteDialogOpen(false);
      toast.success(`Successfully deleted ${selectedIds.length} product(s)`);
    } catch (error) {
      console.error('Failed to delete products:', error);
      toast.error('Failed to delete products');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const selectedCount = Object.keys(rowSelection).filter(key => rowSelection[key]).length;

  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.title?.toLowerCase().includes(searchLower) ||
          product.description?.toLowerCase().includes(searchLower) ||
          product.seller?.username?.toLowerCase().includes(searchLower) ||
          product.seller?.full_name?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((product) => product.status === statusFilter);
    }

    return filtered;
  }, [products, searchTerm, statusFilter]);

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'title',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Product
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => {
          const product = row.original;
          const firstImage = product.images?.[0]?.image_url;
          
          return (
            <div className="flex items-center gap-3 min-w-[300px]">
              {firstImage ? (
                <img
                  src={firstImage}
                  alt={product.images?.[0]?.alt_text || product.title}
                  className="w-12 h-12 rounded-md object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{product.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  {product.seller && (
                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={product.seller.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {product.seller.username?.[0]?.toUpperCase() || 
                           product.seller.full_name?.[0]?.toUpperCase() || 
                           'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground truncate">
                        {product.seller.username || product.seller.full_name || product.seller.email}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Status
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => {
          const product = row.original;
          const status = product.status;
          const statusColors: Record<ProductStatus, string> = {
            active: 'bg-green-500',
            inactive: 'bg-gray-500',
            sold: 'bg-blue-500',
            removed: 'bg-red-500',
            draft: 'bg-yellow-500',
          };
          const isUpdating = updatingStatusId === product.id;
          
          return (
            <div className="flex items-center gap-2">
              <Badge className={`${statusColors[status] || 'bg-gray-500'} text-white capitalize`}>
                {status}
              </Badge>
              <Select
                value={status}
                onValueChange={(value: ProductStatus) => handleStatusChange(product.id, value)}
                disabled={isUpdating}
              >
                <SelectTrigger className="h-8 w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="removed">Removed</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          );
        },
      },
      {
        accessorKey: 'price',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Price
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => {
          const product = row.original;
          return (
            <span className="font-medium">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: product.currency || 'USD',
              }).format(Number(product.price || 0))}
            </span>
          );
        },
      },
      {
        accessorKey: 'location',
        header: 'Location',
        cell: ({ row }) => {
          return row.original.location || '-';
        },
      },
      {
        accessorKey: 'created_at',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Created
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => {
          return (
            <span className="text-sm text-muted-foreground">
              {format(new Date(row.original.created_at), 'dd MMM yyyy')}
            </span>
          );
        },
      },
      {
        accessorKey: 'updated_at',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Updated
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => {
          return (
            <span className="text-sm text-muted-foreground">
              {format(new Date(row.original.updated_at), 'dd MMM yyyy')}
            </span>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredProducts,
    columns,
    state: { sorting, pagination, rowSelection },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Reset to first page when search or filter changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setRowSelection({}); // Clear selection when filters change
  }, [searchTerm, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: products.length,
    };
    products.forEach((product) => {
      counts[product.status] = (counts[product.status] || 0) + 1;
    });
    return counts;
  }, [products]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Products ({filteredProducts.length})</CardTitle>
          {selectedCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedCount} selected
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4 mr-2" />
                    Bulk Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setBulkStatusDialogOpen(true)}>
                    Change Status
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setBulkDeleteDialogOpen(true)}
                    className="text-destructive"
                  >
                    Delete Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by title, description, or seller..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'active', 'inactive', 'sold', 'removed', 'draft'] as const).map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                {statusCounts[status] !== undefined && (
                  <span className="ml-2 text-xs">({statusCounts[status]})</span>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="whitespace-nowrap">
                      {header.isPlaceholder
                        ? null
                        : header.column.columnDef.header instanceof Function
                        ? header.column.columnDef.header(header.getContext())
                        : header.column.columnDef.header}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {cell.column.columnDef.cell instanceof Function
                          ? cell.column.columnDef.cell(cell.getContext())
                          : cell.renderValue()}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No products found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {filteredProducts.length > 0 && table.getPageCount() > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                filteredProducts.length
              )}{' '}
              of {filteredProducts.length} products
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="gap-1 pl-2.5"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </Button>
                </PaginationItem>
                {(() => {
                  const currentPage = table.getState().pagination.pageIndex + 1;
                  const totalPages = table.getPageCount();
                  const pages: (number | 'ellipsis')[] = [];

                  if (totalPages <= 7) {
                    // Show all pages if 7 or fewer
                    for (let i = 1; i <= totalPages; i++) {
                      pages.push(i);
                    }
                  } else {
                    // Always show first page
                    pages.push(1);

                    if (currentPage > 3) {
                      pages.push('ellipsis');
                    }

                    // Show pages around current
                    const start = Math.max(2, currentPage - 1);
                    const end = Math.min(totalPages - 1, currentPage + 1);

                    for (let i = start; i <= end; i++) {
                      if (i !== 1 && i !== totalPages) {
                        pages.push(i);
                      }
                    }

                    if (currentPage < totalPages - 2) {
                      pages.push('ellipsis');
                    }

                    // Always show last page
                    pages.push(totalPages);
                  }

                  return pages.map((page, index) => {
                    if (page === 'ellipsis') {
                      return (
                        <PaginationItem key={`ellipsis-${index}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }

                    return (
                      <PaginationItem key={page}>
                        <Button
                          variant={currentPage === page ? 'outline' : 'ghost'}
                          size="icon"
                          onClick={() => table.setPageIndex(page - 1)}
                          className="h-9 w-9"
                        >
                          {page}
                        </Button>
                      </PaginationItem>
                    );
                  });
                })()}
                <PaginationItem>
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="gap-1 pr-2.5"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>

      {/* Bulk Status Change Dialog */}
      <Dialog open={bulkStatusDialogOpen} onOpenChange={setBulkStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status for {selectedCount} Product(s)</DialogTitle>
            <DialogDescription>
              Select a new status for the selected products.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Selected Products:</h4>
              <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
                {Object.keys(rowSelection)
                  .filter(key => rowSelection[key])
                  .slice(0, 10)
                  .map(key => {
                    const product = products.find(p => p.id === key);
                    return product ? (
                      <p key={key}>• {product.title}</p>
                    ) : null;
                  })}
                {selectedCount > 10 && (
                  <p className="text-muted-foreground">... and {selectedCount - 10} more</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">New Status</label>
              <Select
                value={selectedBulkStatus || ''}
                onValueChange={(value: ProductStatus) => setSelectedBulkStatus(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="removed">Removed</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setBulkStatusDialogOpen(false);
              setSelectedBulkStatus(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkStatusChange}
              disabled={!selectedBulkStatus || bulkActionLoading}
            >
              {bulkActionLoading ? 'Updating...' : `Update ${selectedCount} Product(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span>Delete {selectedCount} Product(s)</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedCount} product(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Selected Products:</h4>
              <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
                {Object.keys(rowSelection)
                  .filter(key => rowSelection[key])
                  .slice(0, 10)
                  .map(key => {
                    const product = products.find(p => p.id === key);
                    return product ? (
                      <p key={key}>• {product.title}</p>
                    ) : null;
                  })}
                {selectedCount > 10 && (
                  <p className="text-muted-foreground">... and {selectedCount - 10} more</p>
                )}
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800">Warning</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Deleting these products will permanently remove them from the database. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
              disabled={bulkActionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {bulkActionLoading ? 'Deleting...' : `Delete ${selectedCount} Product(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

