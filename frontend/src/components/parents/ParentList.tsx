import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { MoreVertical, Edit, Trash2, Eye, Mail, Phone } from 'lucide-react';
import type { Parent } from '../../services/parentService';

interface ParentListProps {
  parents: Parent[];
  onEdit: (parent: Parent) => void;
  onDelete: (parent: Parent) => void;
  onView: (parent: Parent) => void;
  isLoading?: boolean;
}

const ParentList: React.FC<ParentListProps> = ({ parents, onEdit, onDelete, onView, isLoading = false }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                <div className="h-3 bg-gray-300 rounded w-1/3"></div>
              </div>
              <div className="w-20 h-6 bg-gray-300 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Parent</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Children</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parents.map((parent) => (
            <TableRow key={parent.id} className="hover:bg-gray-50">
              <TableCell>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={parent.profileImage} />
                    <AvatarFallback>
                      {`${(parent.firstName ?? '').charAt(0)}${(parent.lastName ?? '').charAt(0)}` || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-gray-900">
                      {parent.firstName} {parent.lastName}
                    </div>
                    <div className="text-sm text-gray-500">ID: {parent.id}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-2" />
                    {parent.email}
                  </div>
                  {parent.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="w-4 h-4 mr-2" />
                      {parent.phone}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {parent.children && parent.children.length > 0 ? (
                  <div className="space-y-1">
                    {parent.children.slice(0, 2).map((child, index) => (
                      <div key={index} className="text-sm text-gray-600">
                        {child.firstName} {child.lastName} ({child.class})
                      </div>
                    ))}
                    {parent.children.length > 2 && (
                      <div className="text-xs text-gray-500">+{parent.children.length - 2} more</div>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">No children</span>
                )}
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(parent.status)}>{parent.status}</Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm text-gray-600">
                  {parent.createdAt ? new Date(parent.createdAt).toLocaleDateString() : 'N/A'}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem 
                      onSelect={() => {
                        // Use a timeout to ensure the dropdown closes before the modal/dialog logic starts
                        setTimeout(() => onView(parent), 0);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onSelect={() => {
                        setTimeout(() => onEdit(parent), 0);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onSelect={() => {
                        setTimeout(() => onDelete(parent), 0);
                      }}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ParentList;