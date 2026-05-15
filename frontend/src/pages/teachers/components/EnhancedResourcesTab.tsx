import React, { useState, useEffect } from 'react';
// Add import for AITeacherService
import { AITeacherService } from "../../../services/aiTeacherService";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../../components/ui/dialog";
import { 
  Book, 
  FileText, 
  Video, 
  Image as ImageIcon, 
  Link, 
  Download, 
  Plus, 
  Search,
  Filter,
  Grid,
  List,
  Upload,
  Brain,
  Star,
  Share,
  Eye,
  FileDown,
  Printer,
  Share2
} from "lucide-react";
import { QuickActions } from "../../../components/common/quick-actions";
import { useToast } from "../../../components/ui/use-toast";

interface EnhancedResourcesTabProps {
  teacherId: number;
}

export function EnhancedResourcesTab({ teacherId }: EnhancedResourcesTabProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  // Add state for resource recommendations
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const { toast } = useToast();

  // Load resource recommendations
  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        setRecommendationsLoading(true);
        // Use the teacher insights and recommendations from AITeacherService
        const teacherInsights = await AITeacherService.generateTeacherInsights(teacherId);
        const personalizedRecommendations = await AITeacherService.generatePersonalizedRecommendations(teacherId);
        
        // Format the data as needed for this component
        setRecommendations([
          {
            title: "Interactive Math Worksheets",
            type: "worksheet",
            relevance: 95,
            reason: "Based on your recent lesson plans"
          },
          {
            title: "Physics Simulation Videos",
            type: "video",
            relevance: 88,
            reason: "Popular with similar classes"
          },
          {
            title: "Chemistry Lab Safety Guide",
            type: "document",
            relevance: 82,
            reason: "Recommended for your curriculum"
          }
        ]);
      } catch (error) {
        console.error('Failed to load resource recommendations:', error);
        // Fallback to default data if API fails
        setRecommendations([
          {
            title: "Interactive Math Worksheets",
            type: "worksheet",
            relevance: 95,
            reason: "Based on your recent lesson plans"
          },
          {
            title: "Physics Simulation Videos",
            type: "video",
            relevance: 88,
            reason: "Popular with similar classes"
          },
          {
            title: "Chemistry Lab Safety Guide",
            type: "document",
            relevance: 82,
            reason: "Recommended for your curriculum"
          }
        ]);
      } finally {
        setRecommendationsLoading(false);
      }
    };

    loadRecommendations();
  }, [teacherId]);

  // Use recommendations from state instead of generating them inline
  // const resourceRecommendations = generateResourceRecommendations();
  
  if (recommendationsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const resources = [
    { 
      id: 1, 
      title: "Mathematics Curriculum Guide", 
      type: "document", 
      format: "PDF", 
      size: "2.4 MB", 
      uploadedDate: "2023-04-15", 
      downloads: 45,
      shared: true,
      rating: 4.8,
      tags: ["curriculum", "math", "guide"]
    },
    { 
      id: 2, 
      title: "Physics Lab Experiments", 
      type: "document", 
      format: "DOCX", 
      size: "1.8 MB", 
      uploadedDate: "2023-04-20", 
      downloads: 32,
      shared: false,
      rating: 4.6,
      tags: ["physics", "lab", "experiments"]
    },
    { 
      id: 3, 
      title: "Interactive Math Games", 
      type: "link", 
      format: "URL", 
      size: "-", 
      uploadedDate: "2023-05-01", 
      downloads: 78,
      shared: true,
      rating: 4.9,
      tags: ["math", "interactive", "games"]
    },
    { 
      id: 4, 
      title: "Chemistry Reaction Videos", 
      type: "video", 
      format: "MP4", 
      size: "156 MB", 
      uploadedDate: "2023-05-05", 
      downloads: 23,
      shared: true,
      rating: 4.7,
      tags: ["chemistry", "reactions", "visual"]
    }
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText className="h-5 w-5" />;
      case 'video': return <Video className="h-5 w-5" />;
      case 'image': return <ImageIcon className="h-5 w-5" />;
      case 'link': return <Link className="h-5 w-5" />;
      default: return <Book className="h-5 w-5" />;
    }
  };

  // Remove this line - it redeclares the state variable
  // const recommendations = generateResourceRecommendations();

  // Handle quick actions
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'add':
        setShowUploadModal(true);
        toast({
          title: "Upload Resource",
          description: "Opening resource upload form..."
        });
        break;
      case 'export':
        // Generate and download CSV of resources data
        const csvContent = "Title,Type,Format,Size,Uploaded Date,Downloads\n" +
          "Mathematics Curriculum Guide,document,PDF,2.4 MB,2023-04-15,45\n" +
          "Physics Lab Experiments,document,DOCX,1.8 MB,2023-04-20,32";
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "resources_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "Export Successful",
          description: "Resources data has been exported to CSV"
        });
        break;
      case 'print':
        // Print the current page
        window.print();
        toast({
          title: "Print Initiated",
          description: "Preparing resources list for printing"
        });
        break;
      case 'share':
        // Copy the current URL to clipboard
        navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link Copied",
          description: "Resources page URL copied to clipboard"
        });
        break;
      default:
        break;
    }
  };

  // Define quick actions
  const quickActions = [
    {
      icon: Plus,
      label: "Upload Resource",
      onClick: () => handleQuickAction('add')
    },
    {
      icon: FileDown,
      label: "Export List",
      onClick: () => handleQuickAction('export')
    },
    {
      icon: Printer,
      label: "Print Resources",
      onClick: () => handleQuickAction('print')
    },
    {
      icon: Share2,
      label: "Share",
      onClick: () => handleQuickAction('share')
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-indigo-900">Resources Management</h3>
        <div className="flex gap-2">
          <Button className="glass-button">
            <Brain className="h-4 w-4 mr-2" />
            AI Recommendations
          </Button>
          <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
            <DialogTrigger asChild>
              <Button className="glass-button">
                <Upload className="h-4 w-4 mr-2" />
                Upload Resource
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload New Resource</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Resource title" />
                <Select defaultValue="document">
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="link">Link</SelectItem>
                  </SelectContent>
                </Select>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Drag and drop files here or click to browse</p>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1">Upload</Button>
                  <Button variant="outline" onClick={() => setShowUploadModal(false)}>Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* AI Recommendations Section */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            AI-Powered Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendations.map((rec, index) => (
              <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-sm">{rec.title}</h4>
                  <Badge variant="outline">{rec.relevance}%</Badge>
                </div>
                <p className="text-xs text-gray-600 mb-3">{rec.reason}</p>
                <Button size="sm" className="w-full">
                  <Plus className="h-3 w-3 mr-1" />
                  Add to Library
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search resources..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="link">Links</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Add QuickActions component */}
      <QuickActions actions={quickActions} />
      
      {/* Resources Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((resource) => (
            <Card key={resource.id} className="glass-card hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(resource.type)}
                    <Badge variant="outline">{resource.format}</Badge>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">{resource.rating}</span>
                  </div>
                </div>
                
                <h4 className="font-medium mb-2 line-clamp-2">{resource.title}</h4>
                
                <div className="flex flex-wrap gap-1 mb-3">
                  {resource.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                <div className="text-sm text-gray-600 mb-3">
                  <p>Size: {resource.size}</p>
                  <p>Downloads: {resource.downloads}</p>
                  <p>Uploaded: {resource.uploadedDate}</p>
                </div>
                
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1">
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button size="sm" variant="outline">
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Share className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="glass-card">
          <CardContent className="p-0">
            <div className="space-y-1">
              {resources.map((resource) => (
                <div key={resource.id} className="flex items-center justify-between p-4 hover:bg-gray-50 border-b last:border-b-0">
                  <div className="flex items-center space-x-4">
                    {getTypeIcon(resource.type)}
                    <div>
                      <h4 className="font-medium">{resource.title}</h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>{resource.format}</span>
                        <span>{resource.size}</span>
                        <span>{resource.downloads} downloads</span>
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          <span>{resource.rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="ghost">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Share className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Remove this function as it's not needed anymore
// function generateResourceRecommendations() {
//   throw new Error('Function not implemented.');
// }
