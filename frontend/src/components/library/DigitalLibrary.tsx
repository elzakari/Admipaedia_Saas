import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      toast.success(editingResource ? t('admin_library.resource_updated', 'Resource updated') : t('admin_library.resource_added', 'Resource added'));
      setDialogOpen(false);
      setEditingResource(null);
    },
    onError: () => toast.error(t('admin_library.failed_save_resource', 'Failed to save digital resource')),
  });

  const deleteMutation = useMutation({
    mutationFn: (resourceId: number) => libraryService.deleteDigitalResource(resourceId),
    onSuccess: () => {
      invalidateResources();
      toast.success(t('admin_library.resource_deleted', 'Resource deleted'));
    },
    onError: () => toast.error(t('admin_library.failed_delete_resource', 'Failed to delete resource')),
  });

  const downloadMutation = useMutation({
    mutationFn: (resourceId: number) => libraryService.downloadDigitalResource(resourceId),
    onSuccess: (resource) => {
      invalidateResources();
      window.open(resource.url, '_blank', 'noopener,noreferrer');
    },
    onError: () => toast.error(t('admin_library.failed_download_resource', 'Failed to open download')),
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
      toast.error(t('admin_library.error_title_url_required', 'Title and resource URL are required'));
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
        <p className="text-sm text-gray-500">{resource.author || t('admin_library.school_library', 'School Library')}</p>
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{resource.category}</span>
          <span className="text-xs">{resource.size || t('admin_library.online', 'Online')}</span>
        </div>
        <p className="text-sm mt-2 line-clamp-2 text-gray-600">{resource.description}</p>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{resource.uploadDate || resource.created_at?.slice(0, 10) || t('admin_library.recently_added', 'Recently added')}</span>
          <span>{t('admin_library.downloads_count', '{{count}} downloads', { count: resource.downloads || 0 })}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open(resource.url, '_blank', 'noopener,noreferrer')}>
            <Eye className="h-3 w-3 mr-1" />
            {t('admin_library.view_action', 'View')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadMutation.mutate(resource.id)} disabled={downloadMutation.isPending}>
            <Download className="h-3 w-3 mr-1" />
            {t('admin_library.download_action', 'Download')}
          </Button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEditDialog(resource)}>
            <Pencil className="h-3 w-3 mr-1" />
            {t('admin_library.edit_action', 'Edit')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(resource.id)} disabled={deleteMutation.isPending}>
            <Trash2 className="h-3 w-3 mr-1" />
            {t('admin_library.remove_action', 'Remove')}
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
                <span className="text-sm font-medium">{t('admin_library.filters', 'Filters:')}</span>
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={t('admin_library.category', 'Category')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin_library.all_categories', 'All Categories')}</SelectItem>
                  {categories.filter(c => c !== 'all').map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={t('admin_library.type', 'Type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin_library.all_types', 'All Types')}</SelectItem>
                  {types.filter(type => type !== 'all').map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              {t('admin_library.add_resource', 'Add Resource')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="all" className="flex items-center">
            <BookOpen className="mr-2 h-4 w-4" />
            {t('admin_library.all_resources', 'All Resources')}
          </TabsTrigger>
          <TabsTrigger value="pdf" className="flex items-center">
            <FileText className="mr-2 h-4 w-4" />
            {t('admin_library.documents', 'Documents')}
          </TabsTrigger>
          <TabsTrigger value="video" className="flex items-center">
            <Video className="mr-2 h-4 w-4" />
            {t('admin_library.videos', 'Videos')}
          </TabsTrigger>
          <TabsTrigger value="audio" className="flex items-center">
            <Headphones className="mr-2 h-4 w-4" />
            {t('admin_library.audio', 'Audio')}
          </TabsTrigger>
          <TabsTrigger value="other" className="flex items-center">
            <ImageIcon className="mr-2 h-4 w-4" />
            {t('admin_library.other', 'Other')}
          </TabsTrigger>
        </TabsList>

        {['all', 'pdf', 'video', 'audio', 'other'].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t('admin_library.loading_digital_resources', 'Loading digital resources...')}
              </div>
            ) : error ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-red-500">
                {t('admin_library.failed_load_digital_resources', 'Failed to load digital resources.')}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredResources.length > 0 ? (
                  filteredResources.map((resource) => renderResourceCard(resource))
                ) : (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-500">{t('admin_library.no_resources_found', 'No resources found matching your criteria.')}</p>
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
            <DialogTitle>{editingResource ? t('admin_library.edit_digital_resource', 'Edit Digital Resource') : t('admin_library.add_digital_resource', 'Add Digital Resource')}</DialogTitle>
            <DialogDescription>
              {t('admin_library.manage_materials_desc', 'Manage online learning materials from the live library catalog.')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="title">{t('admin_library.title_label', 'Title')}</Label>
                <Input id="title" placeholder={t('admin_library.resource_title_placeholder', 'Resource title')} value={String(formState.title || '')} onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="author">{t('admin_library.author_creator_label', 'Author/Creator')}</Label>
                <Input id="author" placeholder={t('admin_library.author_name_placeholder', 'Author name')} value={String(formState.author || '')} onChange={(e) => setFormState((prev) => ({ ...prev, author: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="type">{t('admin_library.resource_type_label', 'Resource Type')}</Label>
                <Select value={String(formState.type || 'PDF')} onValueChange={(value) => setFormState((prev) => ({ ...prev, type: value }))}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder={t('admin_library.select_type_placeholder', 'Select type')} />
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
                <Label htmlFor="category">{t('admin_library.category_label', 'Category')}</Label>
                <Select value={String(formState.category || 'General')} onValueChange={(value) => setFormState((prev) => ({ ...prev, category: value }))}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder={t('admin_library.select_category_placeholder', 'Select category')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">{t('admin_library.category_General', 'General')}</SelectItem>
                    <SelectItem value="Science">{t('admin_library.category_Science', 'Science')}</SelectItem>
                    <SelectItem value="Mathematics">{t('admin_library.category_Mathematics', 'Mathematics')}</SelectItem>
                    <SelectItem value="Literature">{t('admin_library.category_Literature', 'Literature')}</SelectItem>
                    <SelectItem value="History">{t('admin_library.category_History', 'History')}</SelectItem>
                    <SelectItem value="Arts">{t('admin_library.category_Arts', 'Arts')}</SelectItem>
                    <SelectItem value="Technology">{t('admin_library.category_Technology', 'Technology')}</SelectItem>
                    <SelectItem value="Languages">{t('admin_library.category_Languages', 'Languages')}</SelectItem>
                    <SelectItem value="Physical Education">{t('admin_library.category_Physical_Education', 'Physical Education')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="size">{t('admin_library.display_size_label', 'Display Size')}</Label>
                <Input id="size" placeholder="5.2 MB" value={String(formState.size || '')} onChange={(e) => setFormState((prev) => ({ ...prev, size: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label htmlFor="description">{t('admin_library.description_label', 'Description')}</Label>
                <Textarea id="description" placeholder={t('admin_library.description_placeholder', 'Brief description of the resource')} value={String(formState.description || '')} onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))} rows={3} />
              </div>
              <div className="col-span-2">
                <Label htmlFor="thumbnail">{t('admin_library.thumbnail_image_label', 'Thumbnail Image')}</Label>
                <Input id="thumbnail" placeholder="https://example.com/thumbnail.jpg" value={String(formState.thumbnail || '')} onChange={(e) => setFormState((prev) => ({ ...prev, thumbnail: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label htmlFor="url">{t('admin_library.resource_url_label', 'Resource URL')}</Label>
                <div className="flex gap-2">
                  <Input id="url" placeholder="https://example.com/resource" className="flex-1" value={String(formState.url || '')} onChange={(e) => setFormState((prev) => ({ ...prev, url: e.target.value }))} />
                  <Button variant="outline" onClick={() => formState.url && window.open(String(formState.url), '_blank', 'noopener,noreferrer')}>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    {t('admin_library.open_action', 'Open')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('admin_library.cancel', 'Cancel')}</Button>
            <Button type="submit" onClick={submitForm} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editingResource ? t('admin_library.save_changes', 'Save Changes') : t('admin_library.add_resource', 'Add Resource')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DigitalLibrary;
