import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Search, Plus, MoreHorizontal, FileText, Upload } from 'lucide-react';
import { format } from "date-fns";
import classService from "../../services/classService";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { useToast } from "../ui/use-toast";

interface ClassResourcesTabProps {
  classId: number;
}

interface Resource {
  id: number;
  title: string;
  type: string;
  url?: string;
  file_path?: string;
  description?: string;
  created_at: string;
}

export function ClassResourcesTab({ classId }: ClassResourcesTabProps) {
  // State for resource dialog
  const [isAddResourceOpen, setIsAddResourceOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [resourceData, setResourceData] = useState({
    title: "",
    type: "document",
    url: "",
    description: ""
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch resources for selected class
  const { data: resourcesData, isLoading } = useQuery({
    queryKey: ['class-resources', classId],
    queryFn: () => classService.getClassResources ? classService.getClassResources(classId) : Promise.resolve([]),
    enabled: !!classId && !!classService.getClassResources,
  });
  
  // Create resource mutation
  const createResourceMutation = useMutation({
    mutationFn: (data: { resourceData: any, file: File | null }) => {
      return classService.createClassResource(classId, data.resourceData, data.file || undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-resources', classId] });
      setIsAddResourceOpen(false);
      resetForm();
      toast({
        title: "Resource created",
        description: "The resource has been successfully created.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create resource. Please try again.",
        variant: "destructive",
      });
      console.error("Error creating resource:", error);
    }
  });
  
  // Delete resource mutation
  const deleteResourceMutation = useMutation({
    mutationFn: (resourceId: number) => {
      return classService.deleteClassResource(classId, resourceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-resources', classId] });
      toast({
        title: "Resource deleted",
        description: "The resource has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete resource. Please try again.",
        variant: "destructive",
      });
      console.error("Error deleting resource:", error);
    }
  });
  
  const resources = resourcesData || [];
  
  // Filter resources based on search query
  const filteredResources = resources.filter((resource: Resource) => 
    resource.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setResourceData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  // Reset form
  const resetForm = () => {
    setResourceData({
      title: "",
      type: "document",
      url: "",
      description: ""
    });
    setSelectedFile(null);
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createResourceMutation.mutate({ resourceData, file: selectedFile });
  };
  
  // Handle resource deletion
  const handleDeleteResource = (resourceId: number) => {
    if (confirm("Are you sure you want to delete this resource?")) {
      deleteResourceMutation.mutate(resourceId);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search resources..." 
            className="pl-8" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button onClick={() => setIsAddResourceOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Resource
        </Button>
      </div>
      
      {isLoading ? (
        <div className="text-center py-4">Loading resources...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Resource</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredResources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4">
                  No resources found
                </TableCell>
              </TableRow>
            ) : (
              filteredResources.map((resource: Resource) => (
                <TableRow key={resource.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-full bg-purple-100">
                        <FileText className="h-4 w-4 text-purple-500" />
                      </div>
                      <div>
                        <p className="font-medium">{resource.title}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{resource.type}</Badge>
                  </TableCell>
                  <TableCell>{format(new Date(resource.created_at), 'PPP')}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {resource.file_path && (
                          <DropdownMenuItem asChild>
                            <a href={`/api/v1/download/${resource.file_path}`} target="_blank" rel="noopener noreferrer">
                              Download
                            </a>
                          </DropdownMenuItem>
                        )}
                        {resource.url && (
                          <DropdownMenuItem asChild>
                            <a href={resource.url} target="_blank" rel="noopener noreferrer">
                              View
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDeleteResource(resource.id)}>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
      
      {/* Add Resource Dialog */}
      <Dialog open={isAddResourceOpen} onOpenChange={setIsAddResourceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Resource</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={resourceData.title}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">Type</Label>
                <Select 
                  name="type" 
                  value={resourceData.type} 
                  onValueChange={(value) => setResourceData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="link">Link</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {resourceData.type === 'link' ? (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="url" className="text-right">URL</Label>
                  <Input
                    id="url"
                    name="url"
                    value={resourceData.url}
                    onChange={handleInputChange}
                    className="col-span-3"
                    required
                  />
                </div>
              ) : (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="file" className="text-right">File</Label>
                  <div className="col-span-3">
                    <Input
                      id="file"
                      type="file"
                      onChange={handleFileChange}
                      className="col-span-3"
                    />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={resourceData.description}
                  onChange={handleInputChange}
                  className="col-span-3"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddResourceOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createResourceMutation.isPending}>
                {createResourceMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
