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
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { 
  Plus, 
  Edit, 
  Trash2,
  Settings,
  Search,
  Filter,
  ChevronRight,
  List,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  AlertTriangle
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase, ProductAttribute } from '@/lib/supabase';
import { AttributeForm } from './AttributeForm';
import { DeleteAttributeDialog } from './DeleteAttributeDialog';
import { AttributeTermsDialog } from './AttributeTermsDialog';

interface AttributeWithCounts extends ProductAttribute {
  terms_count: number;
  product_count: number;
}

export function AttributeList() {
  const [attributes, setAttributes] = useState<AttributeWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<ProductAttribute | null>(null);
  const [deletingAttribute, setDeletingAttribute] = useState<ProductAttribute | null>(null);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [selectedAttribute, setSelectedAttribute] = useState<ProductAttribute | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 100,
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchAttributes();
  }, []);

  const fetchAttributes = async () => {
    try {
      setLoading(true);
      
      // Get attributes with counts
      const { data, error } = await supabase
        .from('product_attributes')
        .select(`
          *,
          product_attribute_terms(count),
          product_attribute_relationships(count)
        `)
        .order('name');

      if (error) {
        console.error('Error fetching attributes:', error);
        return;
      }

      // Process the data to get counts
      const processedAttributes: AttributeWithCounts[] = data?.map(attr => ({
        ...attr,
        terms_count: attr.product_attribute_terms?.[0]?.count || 0,
        product_count: attr.product_attribute_relationships?.[0]?.count || 0
      })) || [];

      setAttributes(processedAttributes);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAttribute = () => {
    setEditingAttribute(null);
    setShowForm(true);
  };

  const handleEditAttribute = (attribute: ProductAttribute) => {
    setEditingAttribute(attribute);
    setShowForm(true);
  };

  const handleDeleteAttribute = (attribute: ProductAttribute) => {
    setDeletingAttribute(attribute);
  };

  const handleManageTerms = (attribute: ProductAttribute) => {
    setSelectedAttribute(attribute);
    setShowTermsDialog(true);
  };

  const handleFormSubmit = async () => {
    await fetchAttributes();
    setShowForm(false);
    setEditingAttribute(null);
  };

  const handleDeleteConfirm = async () => {
    if (deletingAttribute) {
      try {
        const { error } = await supabase
          .from('product_attributes')
          .delete()
          .eq('id', deletingAttribute.id);

        if (error) {
          console.error('Error deleting attribute:', error);
          toast.error('Failed to delete attribute');
          return;
        }

        await fetchAttributes();
        setDeletingAttribute(null);
        toast.success('Attribute deleted successfully');
      } catch (error) {
        console.error('Error:', error);
        toast.error('Failed to delete attribute');
      }
    }
  };

  const handleBulkDelete = async () => {
    const selectedIds = Object.keys(rowSelection).filter(key => rowSelection[key]);
    
    if (selectedIds.length === 0) {
      return;
    }

    try {
      const { error } = await supabase
        .from('product_attributes')
        .delete()
        .in('id', selectedIds);

      if (error) {
        console.error('Error deleting attributes:', error);
        toast.error('Failed to delete attributes');
        return;
      }

      await fetchAttributes();
      setRowSelection({});
      setBulkDeleteDialogOpen(false);
      toast.success(`Successfully deleted ${selectedIds.length} attribute(s)`);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to delete attributes');
    }
  };

  const selectedCount = Object.keys(rowSelection).filter(key => rowSelection[key]).length;

  // Filter attributes based on search and filter
  const filteredAttributes = useMemo(() => {
    return attributes.filter(attr => {
      const matchesSearch = attr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           attr.ar_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           attr.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           attr.slug.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterActive === 'all' || 
                           (filterActive === 'active' && attr.is_active) ||
                           (filterActive === 'inactive' && !attr.is_active);
      
      return matchesSearch && matchesFilter;
    });
  }, [attributes, searchTerm, filterActive]);

  const columns = useMemo<ColumnDef<AttributeWithCounts>[]>(
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
        accessorKey: 'name',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Name
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
          const attr = row.original;
          return (
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-blue-500" />
              <div className="flex flex-col">
                <span className="font-medium">{attr.name}</span>
                {attr.ar_name && (
                  <span className="text-xs text-muted-foreground" dir="rtl">
                    {attr.ar_name}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'slug',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Slug
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
        cell: ({ row }) => (
          <code className="text-xs bg-muted px-2 py-1 rounded">
            {row.original.slug}
          </code>
        ),
      },
      {
        accessorKey: 'terms_count',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Terms
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
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.terms_count}</Badge>
        ),
      },
      {
        accessorKey: 'product_count',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Products
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
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.product_count}</Badge>
        ),
      },
      {
        accessorKey: 'sort_order',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Sort Order
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
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.sort_order}</span>
        ),
      },
      {
        accessorKey: 'is_active',
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
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
            {row.original.is_active ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const attr = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleManageTerms(attr)}
                className="h-8 w-8 p-0 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-300"
                title="Manage terms"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEditAttribute(attr)}
                className="h-8 w-8 p-0"
                title="Edit attribute"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteAttribute(attr)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                title="Delete attribute"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredAttributes,
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
  }, [searchTerm, filterActive]);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Product Attributes</h2>
          <p className="text-muted-foreground">
            Manage product attributes for filtering and variable products
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <Button
              variant="destructive"
              onClick={() => setBulkDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedCount})
            </Button>
          )}
          <Button onClick={handleAddAttribute}>
            <Plus className="h-4 w-4 mr-2" />
            Add Attribute
          </Button>
        </div>
      </div>

      <Separator />

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search attributes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Label htmlFor="filter" className="text-sm font-medium">Filter:</Label>
          <select
            id="filter"
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value as any)}
            className="border border-input bg-background px-3 py-2 rounded-md text-sm"
          >
            <option value="all">All Attributes</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {filteredAttributes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm || filterActive !== 'all' ? 'No attributes found' : 'No attributes yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || filterActive !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Create your first attribute to get started'
              }
            </p>
            {!searchTerm && filterActive === 'all' && (
              <Button onClick={handleAddAttribute}>
                <Plus className="h-4 w-4 mr-2" />
                Create Attribute
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border overflow-x-auto">
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
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {filteredAttributes.length > 0 && table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              filteredAttributes.length
            )}{' '}
            of {filteredAttributes.length} attributes
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

      {showForm && (
        <AttributeForm
          attribute={editingAttribute}
          onClose={() => {
            setShowForm(false);
            setEditingAttribute(null);
          }}
          onSubmit={handleFormSubmit}
        />
      )}

      {deletingAttribute && (
        <DeleteAttributeDialog
          attribute={deletingAttribute}
          onClose={() => setDeletingAttribute(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}

      {showTermsDialog && selectedAttribute && (
        <AttributeTermsDialog
          attribute={selectedAttribute}
          onClose={() => {
            setShowTermsDialog(false);
            setSelectedAttribute(null);
          }}
          onUpdate={fetchAttributes}
        />
      )}

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span>Delete Multiple Attributes</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedCount} attribute(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Selected Attributes:</h4>
              <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
                {Object.keys(rowSelection)
                  .filter(key => rowSelection[key])
                  .map(key => {
                    const attr = attributes.find(a => a.id === key);
                    return attr ? (
                      <p key={key}>• {attr.name}</p>
                    ) : null;
                  })}
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800">Warning</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Deleting these attributes will also remove all associated terms and remove the attributes from all products.
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
              className="bg-red-600 hover:bg-red-700"
            >
              Delete {selectedCount} Attribute(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 