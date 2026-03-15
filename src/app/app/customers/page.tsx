'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Users, MoreHorizontal, Eye, Archive, Mail, Phone } from 'lucide-react'
import { useCustomers, useArchiveCustomer } from '@/features/customers/hooks'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CustomerSheet } from './components/customer-sheet'
import type { CustomerType } from '@/types/database'

const customerTypeLabels: Record<CustomerType, string> = {
  lead: 'Lead',
  customer: 'Customer',
  repeat: 'Repeat',
  vip: 'VIP',
  inactive: 'Inactive',
  do_not_service: 'Do Not Service',
}

const customerTypeColors: Record<CustomerType, string> = {
  lead: 'bg-yellow-100 text-yellow-800',
  customer: 'bg-blue-100 text-blue-800',
  repeat: 'bg-green-100 text-green-800',
  vip: 'bg-purple-100 text-purple-800',
  inactive: 'bg-gray-100 text-gray-600',
  do_not_service: 'bg-red-100 text-red-800',
}

export default function CustomersPage() {
  const { data: customers, isLoading, error } = useCustomers()
  const archiveMutation = useArchiveCustomer()
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleNewCustomer = () => {
    setSheetOpen(true)
  }

  const handleArchiveCustomer = async (customerId: string, name: string) => {
    if (confirm(`Are you sure you want to archive ${name}? They will no longer appear in active lists.`)) {
      await archiveMutation.mutateAsync(customerId)
    }
  }

  const handleSheetClose = () => {
    setSheetOpen(false)
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-destructive mb-4">Failed to load customers</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage your customer database"
        actions={
          <Button onClick={handleNewCustomer}>
            <Plus className="mr-2 h-4 w-4" />
            New Customer
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton columns={5} rows={8} />
      ) : customers && customers.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <Link
                      href={`/app/customers/${customer.id}`}
                      className="flex flex-col hover:underline"
                    >
                      <span className="font-medium">
                        {customer.first_name} {customer.last_name}
                      </span>
                      {customer.notes && (
                        <span className="text-sm text-muted-foreground line-clamp-1">
                          {customer.notes}
                        </span>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {customer.email && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {customer.email}
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={customerTypeColors[customer.customer_type]}
                    >
                      {customerTypeLabels[customer.customer_type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {customer.is_active ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/app/customers/${customer.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            handleArchiveCustomer(
                              customer.id,
                              `${customer.first_name} ${customer.last_name}`
                            )
                          }
                          className="text-destructive focus:text-destructive"
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Add your first customer to start managing their bookings and properties."
          action={{
            label: 'Add Customer',
            onClick: handleNewCustomer,
          }}
        />
      )}

      <CustomerSheet
        open={sheetOpen}
        onOpenChange={handleSheetClose}
      />
    </div>
  )
}
