import React, { useState } from "react";
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
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
  List
} from "lucide-react";

interface ResourcesTabProps {
  teacherId: number;
}

export function ResourcesTab({ teacherId }: ResourcesTabProps) {
  // In a real implementation, you would fetch resources data using a custom hook
  // const { data, isLoading, error } = useTeacherResources(teacherId);
  
  const [activeResourceTab, setActiveResourceTab] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Mock data for demonstration
  const resources = [
    { 
      id: 1, 
      title: "Mathematics Curriculum Guide", 
      type: "document", 
      format: "PDF", 
      size: "2.4 MB", 
      uploadedDate: "2023-04-15", 
      downloads: 45,
      shared: true
    },
    { 
      id: 2, 
      title: "Physics Lab Experiments", 
      type: "document", 
      format: "DOCX", 
      size: "1.8 MB", 
      uploadedDate: "2023-04-10", 
      downloads: 32,
      shared: true
    },
    { 
      id: 3, 
      title: "Introduction to Algebra", 
      type: "video", 
      format: "MP4", 
      size: "45 MB", 
      uploadedDate: "2023-03-28", 
      downloads: 78,
      shared: false
    },
    { 
      id: 4, 
      title: "Chemistry Periodic Table", 
      type: "image", 
      format: "PNG", 
      size: "3.2 MB", 
      uploadedDate: "2023-03-15", 
      downloads: 120,
      shared: true
    },
    { 
      id: 5, 
      title: "Online Learning Resources", 
      type: "link", 
      format: "URL", 
      size: "-", 
      uploadedDate: "2023-02-20", 
      downloads: 65,
      shared: false
    },
  ];

  // Filter resources based on active tab and search query
  const filteredResources = resources.filter(resource => {
    const matchesTab = activeResourceTab === "all" || 
                      (activeResourceTab === "shared" && resource.shared) ||
                      (activeResourceTab === resource.type);
                      
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesTab && matchesSearch;
  });

  // Get icon based on resource type
  const getResourceIcon = (type: string) => {
    switch (type) {
      case "document":
        return <FileText className="h-5 w-5" />;
      case "video":
        return <Video className="h-5 w-5" />;
      case "image":
        return <ImageIcon className="h-5 w-5" />;
      case "link":
        return <Link className="h-5 w-5" />;
      default:
        return <Book className="h-5 w-5" />;
    }
  };

  // Get color based on resource type
  const getResourceColor = (type: string) => {
    switch (type) {
      case "document":
        return "bg-blue-100 text-blue-700";
      case "video":
        return "bg-red-100 text-red-700";
      case "image":
        return "bg-green-100 text-green-700";
      case "link":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-indigo-100 text-indigo-700";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-indigo-900">Teaching Resources</h3>
        <Button className="flex items-center glass-button">
          <Plus className="h-4 w-4 mr-2" />
          Add Resource
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-indigo-400" />
          <Input
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 glass-input"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant={viewMode === "grid" ? "default" : "outline"} 
            size="sm" 
            className="glass-button" 
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button 
            variant={viewMode === "list" ? "default" : "outline"} 
            size="sm" 
            className="glass-button" 
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="glass-button-outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>
      
      <Card className="glass-card overflow-hidden">
        <Tabs defaultValue="all" value={activeResourceTab} onValueChange={setActiveResourceTab}>
          <TabsList className="glass-tabs w-full justify-start p-2">
            <TabsTrigger value="all" className="flex items-center">
              <Book className="h-4 w-4 mr-2" />
              All Resources
            </TabsTrigger>
            <TabsTrigger value="document" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center">
              <Video className="h-4 w-4 mr-2" />
              Videos
            </TabsTrigger>
            <TabsTrigger value="image" className="flex items-center">
              <ImageIcon className="h-4 w-4 mr-2" />
              Images
            </TabsTrigger>
            <TabsTrigger value="shared" className="flex items-center">
              <Link className="h-4 w-4 mr-2" />
              Shared
            </TabsTrigger>
          </TabsList>
          
          <CardContent className="p-4">
            {filteredResources.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-indigo-700">No resources found matching your criteria.</p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredResources.map((resource) => (
                  <Card key={resource.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <div className={`p-4 ${getResourceColor(resource.type)} flex justify-center items-center h-32`}>
                      {getResourceIcon(resource.type)}
                    </div>
                    <CardContent className="p-4">
                      <h4 className="font-medium text-indigo-900 mb-2 truncate">{resource.title}</h4>
                      <div className="flex justify-between items-center mb-2">
                        <Badge variant="outline">{resource.format}</Badge>
                        <span className="text-xs text-indigo-600">{resource.size}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-indigo-600">
                          {new Date(resource.uploadedDate).toLocaleDateString()}
                        </span>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-indigo-100">
                {filteredResources.map((resource) => (
                  <div key={resource.id} className="py-3 flex items-center hover:bg-indigo-50 px-2 rounded-md">
                    <div className={`p-2 rounded-full ${getResourceColor(resource.type)} mr-3`}>
                      {getResourceIcon(resource.type)}
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-medium text-indigo-900">{resource.title}</h4>
                      <div className="flex items-center space-x-2 text-xs text-indigo-600">
                        <Badge variant="outline">{resource.format}</Badge>
                        <span>{resource.size}</span>
                        <span>{new Date(resource.uploadedDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-indigo-600">{resource.downloads} downloads</span>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}