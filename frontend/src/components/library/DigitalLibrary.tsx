import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";
import {
  FileText,
  Video,
  Headphones,
  Image as ImageIcon,
  Download,
  Eye,
  Filter,
  Plus,
  Link as LinkIcon,
  BookOpen,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react';
import libraryService, { DigitalLibraryResource } from '../../services/libraryService';

interface DigitalLibraryProps {
  searchTerm: string;
}

const DigitalLibrary: React.FC<DigitalLibraryProps> = ({ searchTerm }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<DigitalLibraryResource | null>(null);
  const [formState, setFormState] = useState<Partial<DigitalLibraryResource>>({
    title: '',
    author: '',
    type: 'PDF',
    category: 'General',
    size: '',
    url: '',
    thumbnail: '',
    description: '',
  });

  const { data: resources = [], isLoading, error } = useQuery({
    queryKey: ['library-digital-resources', searchTerm, selectedCategory, selectedType],
    queryFn: () => libraryService.getDigitalResources({
      search: searchTerm || undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      type: selectedType !== 'all' ? selectedType : undefined,
    }),
    staleTime: 30_000,
  });

  const invalidateResources = () => {
    queryClient.invalidateQueries({ queryKey: ['library-digital-resources'] });
    queryClient.invalidateQueries({ queryKey: ['library-statistics'] });
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<DigitalLibraryResource>) => {
      if (editingResource?.id) {
        return libraryService.updateDigitalResource(editingResource.id, payload);
      }
      return libraryService.createDigitalResource(payload);
    },
    onSuccess: () => {
      invalidateResources();
      toast.success(editingResource ? 'Resource updated' : 'Resource added');
      setDialogOpen(false);
      setEditingResource(null);
    },
    onError: () => toast.error('Failed to save digital resource'),
  });

  const deleteMutation = useMutation({
    mutationFn: (resourceId: number) => libraryService.deleteDigitalResource(resourceId),
    onSuccess: () => {
      invalidateResources();
      toast.success('Resource deleted');
    },
    onError: () => toast.error('Failed to delete resource'),
  });

  const downloadMutation = useMutation({
    mutationFn: (resourceId: number) => libraryService.downloadDigitalResource(resourceId),
    onSuccess: (resource) => {
      invalidateResources();
      window.open(resource.url, '_blank', 'noopener,noreferrer');
    },
    onError: () => toast.error('Failed to open download'),
  });

  const categories = useMemo(
    () => ['all', ...new Set(resources.map((resource) => resource.category).filter(Boolean))],
    [resources]
  );
  const types = useMemo(
    () => ['all', ...new Set(resources.map((resource) => resource.type).filter(Boolean))],
    [resources]
  );

  const filteredResources = useMemo(() => {
    if (activeTab === 'all') return resources;
    if (activeTab === 'pdf') return resources.filter((resource) => ['PDF', 'E-Book', 'Document'].includes(resource.type));
    if (activeTab === 'video') return resources.filter((resource) => resource.type === 'Video');
    if (activeTab === 'audio') return resources.filter((resource) => resource.type === 'Audio');
    return resources.filter((resource) => !['PDF', 'E-Book', 'Document', 'Video', 'Audio'].includes(resource.type));
  }, [activeTab, resources]);

  const openCreateDialog = () => {
    setEditingResource(null);
    setFormState({
      title: '',
      author: '',
      type: 'PDF',
      category: 'General',
      size: '',
      url: '',
      thumbnail: '',
      description: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (resource: DigitalLibraryResource) => {
    setEditingResource(resource);
    setFormState(resource);
    setDialogOpen(true);
  };

  const submitForm = () => {
    const payload = {
      title: String(formState.title || '').trim(),
      author: String(formState.author || '').trim() || undefined,
      type: String(formState.type || 'PDF').trim(),
      category: String(formState.category || 'General').trim(),
      size: String(formState.size || '').trim() || undefined,
      url: String(formState.url || '').trim(),
      thumbnail: String(formState.thumbnail || '').trim() || undefined,
      description: String(formState.description || '').trim() || undefined,
    };

    if (!payload.title || !payload.url) {
      toast.error('Title and resource URL are required');
      return;
    }

    saveMutation.mutate(payload);
  };

  const renderResourceCard = (resource: DigitalLibraryResource) => (
    <Card key={resource.id} className="overflow-hidden">
      <div className="aspect-video relative bg-slate-100">
        {resource.thumbnail ? (
          <img
            src={resource.thumbnail}
            alt={resource.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <BookOpen className="h-12 w-12" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge
            variant="outline"
            className={
              resource.type === 'PDF' || resource.type === 'Document' ? 'bg-blue-100 text-blue-800 border-blue-200' :
              resource.type === 'E-Book' ? 'bg-green-100 text-green-800 border-green-200' :
              resource.type === 'Video' ? 'bg-red-100 text-red-800 border-red-200' :
              resource.type === 'Audio' ? 'bg-purple-100 text-purple-800 border-purple-200' :
              'bg-gray-100 text-gray-800 border-gray-200'
            }
          >
            {resource.type}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="font-bold truncate">{resource.title}</h3>
        <p className="text-sm text-gray-500">{resource.author || 'School Library'}</p>
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{resource.category}</span>
          <span className="text-xs">{resource.size || 'Online'}</span>
        </div>
        <p className="text-sm mt-2 line-clamp-2 text-gray-600">{resource.description}</p>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{resource.uploadDate || resource.created_at?.slice(0, 10) || 'Recently added'}</span>
          <span>{resource.downloads || 0} downloads</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open(resource.url, '_blank', 'noopener,noreferrer')}>
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadMutation.mutate(resource.id)} disabled={downloadMutation.isPending}>
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEditDialog(resource)}>
            <Pencil className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(resource.id)} disabled={deleteMutation.isPending}>
            <Trash2 className="h-3 w-3 mr-1" />
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center">
                <Filter className="mr-2 h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.filter(c => c !== 'all').map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {types.filter(t => t !== 'all').map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Resource
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="all" className="flex items-center">
            <BookOpen className="mr-2 h-4 w-4" />
            All Resources
          </TabsTrigger>
          <TabsTrigger value="pdf" className="flex items-center">
            <FileText className="mr-2 h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="video" className="flex items-center">
            <Video className="mr-2 h-4 w-4" />
            Videos
          </TabsTrigger>
          <TabsTrigger value="audio" className="flex items-center">
            <Headphones className="mr-2 h-4 w-4" />
            Audio
          </TabsTrigger>
          <TabsTrigger value="other" className="flex items-center">
            <ImageIcon className="mr-2 h-4 w-4" />
            Other
          </TabsTrigger>
        </TabsList>

        {['all', 'pdf', 'video', 'audio', 'other'].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading digital resources...
              </div>
            ) : error ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-red-500">
                Failed to load digital resources.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredResources.length > 0 ? (
                  filteredResources.map((resource) => renderResourceCard(resource))
                ) : (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-500">No resources found matching your criteria.</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingResource ? 'Edit Digital Resource' : 'Add Digital Resource'}</DialogTitle>
            <DialogDescription>
              Manage online learning materials from the live library catalog.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" placeholder="Resource title" value={String(formState.title || '')} onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="author">Author/Creator</Label>
                <Input id="author" placeholder="Author name" value={String(formState.author || '')} onChange={(e) => setFormState((prev) => ({ ...prev, author: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="type">Resource Type</Label>
                <Select value={String(formState.type || 'PDF')} onValueChange={(value) => setFormState((prev) => ({ ...prev, type: value }))}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PDF">PDF</SelectItem>
                    <SelectItem value="E-Book">E-Book</SelectItem>
                    <SelectItem value="Video">Video</SelectItem>
                    <SelectItem value="Audio">Audio</SelectItem>
                    <SelectItem value="Presentation">Presentation</SelectItem>
                    <SelectItem value="Interactive">Interactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={String(formState.category || 'General')} onValueChange={(value) => setFormState((prev) => ({ ...prev, category: value }))}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Science">Science</SelectItem>
                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                    <SelectItem value="Literature">Literature</SelectItem>
                    <SelectItem value="History">History</SelectItem>
                    <SelectItem value="Arts">Arts</SelectItem>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Languages">Languages</SelectItem>
                    <SelectItem value="Physical Education">Physical Education</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="size">Display Size</Label>
                <Input id="size" placeholder="5.2 MB" value={String(formState.size || '')} onChange={(e) => setFormState((prev) => ({ ...prev, size: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Brief description of the resource" value={String(formState.description || '')} onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))} rows={3} />
              </div>
              <div className="col-span-2">
                <Label htmlFor="thumbnail">Thumbnail Image</Label>
                <Input id="thumbnail" placeholder="https://example.com/thumbnail.jpg" value={String(formState.thumbnail || '')} onChange={(e) => setFormState((prev) => ({ ...prev, thumbnail: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label htmlFor="url">Resource URL</Label>
                <div className="flex gap-2">
                  <Input id="url" placeholder="https://example.com/resource" className="flex-1" value={String(formState.url || '')} onChange={(e) => setFormState((prev) => ({ ...prev, url: e.target.value }))} />
                  <Button variant="outline" onClick={() => formState.url && window.open(String(formState.url), '_blank', 'noopener,noreferrer')}>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Open
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" onClick={submitForm} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editingResource ? 'Save Changes' : 'Add Resource'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DigitalLibrary;
