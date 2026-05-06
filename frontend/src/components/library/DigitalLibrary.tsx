import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { 
  FileText, 
  Video, 
  Headphones, 
  Image as ImageIcon, 
  Download, 
  Eye, 
  Filter, 
  Plus, 
  Upload, 
  Link as LinkIcon,
  BookOpen,
  Search
} from 'lucide-react';

// Mock data for digital resources
const mockDigitalResources = [
  {
    id: 1,
    title: "Introduction to Biology",
    type: "PDF",
    category: "Science",
    author: "Dr. Jane Smith",
    uploadDate: "2023-09-15",
    size: "5.2 MB",
    downloads: 128,
    thumbnail: "https://via.placeholder.com/150/3b82f6/ffffff?text=Biology",
    url: "#",
    description: "A comprehensive introduction to biology for high school students."
  },
  {
    id: 2,
    title: "World History: Ancient Civilizations",
    type: "PDF",
    category: "History",
    author: "Prof. Michael Johnson",
    uploadDate: "2023-08-22",
    size: "8.7 MB",
    downloads: 95,
    thumbnail: "https://via.placeholder.com/150/8b5cf6/ffffff?text=History",
    url: "#",
    description: "Explore the ancient civilizations that shaped our world."
  },
  {
    id: 3,
    title: "Algebra Fundamentals",
    type: "PDF",
    category: "Mathematics",
    author: "Sarah Williams",
    uploadDate: "2023-09-05",
    size: "3.1 MB",
    downloads: 210,
    thumbnail: "https://via.placeholder.com/150/22c55e/ffffff?text=Math",
    url: "#",
    description: "Master the fundamentals of algebra with this comprehensive guide."
  },
  {
    id: 4,
    title: "Chemistry Lab Experiments",
    type: "Video",
    category: "Science",
    author: "Dr. Robert Chen",
    uploadDate: "2023-07-18",
    size: "245 MB",
    downloads: 76,
    thumbnail: "https://via.placeholder.com/150/ef4444/ffffff?text=Chemistry",
    url: "#",
    description: "Video demonstrations of key chemistry lab experiments for high school students."
  },
  {
    id: 5,
    title: "English Literature Classics",
    type: "E-Book",
    category: "Literature",
    author: "Emily Brooks",
    uploadDate: "2023-08-30",
    size: "12.5 MB",
    downloads: 154,
    thumbnail: "https://via.placeholder.com/150/f97316/ffffff?text=Literature",
    url: "#",
    description: "A collection of classic English literature works with analysis and commentary."
  },
  {
    id: 6,
    title: "Physics Principles Explained",
    type: "Audio",
    category: "Science",
    author: "Dr. Alan Parker",
    uploadDate: "2023-09-10",
    size: "85 MB",
    downloads: 62,
    thumbnail: "https://via.placeholder.com/150/06b6d4/ffffff?text=Physics",
    url: "#",
    description: "Audio lectures explaining fundamental physics principles in an accessible way."
  },
  {
    id: 7,
    title: "Art History: Renaissance to Modern",
    type: "Presentation",
    category: "Arts",
    author: "Lisa Turner",
    uploadDate: "2023-08-05",
    size: "18.3 MB",
    downloads: 89,
    thumbnail: "https://via.placeholder.com/150/ec4899/ffffff?text=Art",
    url: "#",
    description: "A visual journey through art history from the Renaissance to modern times."
  },
  {
    id: 8,
    title: "Computer Science Basics",
    type: "PDF",
    category: "Technology",
    author: "Mark Wilson",
    uploadDate: "2023-09-20",
    size: "4.8 MB",
    downloads: 175,
    thumbnail: "https://via.placeholder.com/150/6366f1/ffffff?text=CS",
    url: "#",
    description: "An introduction to computer science concepts for beginners."
  },
  {
    id: 9,
    title: "Geography: World Exploration",
    type: "Interactive",
    category: "Geography",
    author: "David Miller",
    uploadDate: "2023-07-25",
    size: "120 MB",
    downloads: 105,
    thumbnail: "https://via.placeholder.com/150/84cc16/ffffff?text=Geography",
    url: "#",
    description: "An interactive exploration of world geography with maps and activities."
  },
  {
    id: 10,
    title: "Music Theory Fundamentals",
    type: "Audio",
    category: "Music",
    author: "Jennifer Davis",
    uploadDate: "2023-08-15",
    size: "95 MB",
    downloads: 68,
    thumbnail: "https://via.placeholder.com/150/f43f5e/ffffff?text=Music",
    url: "#",
    description: "Audio lessons covering the fundamentals of music theory with examples."
  },
  {
    id: 11,
    title: "Spanish Language Basics",
    type: "Audio",
    category: "Languages",
    author: "Carlos Rodriguez",
    uploadDate: "2023-09-08",
    size: "110 MB",
    downloads: 92,
    thumbnail: "https://via.placeholder.com/150/facc15/ffffff?text=Spanish",
    url: "#",
    description: "Audio lessons for beginners learning Spanish language basics."
  },
  {
    id: 12,
    title: "Physical Education: Fitness Guide",
    type: "Video",
    category: "Physical Education",
    author: "James Thompson",
    uploadDate: "2023-08-28",
    size: "320 MB",
    downloads: 81,
    thumbnail: "https://via.placeholder.com/150/14b8a6/ffffff?text=PE",
    url: "#",
    description: "Video guide to fitness exercises and sports techniques for physical education."
  }
];

interface DigitalLibraryProps {
  searchTerm: string;
}

const DigitalLibrary: React.FC<DigitalLibraryProps> = ({ searchTerm }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  
  // Filter resources based on search term, category, and type
  const filteredResources = mockDigitalResources.filter(resource => {
    const matchesSearch = 
      resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory;
    const matchesType = selectedType === 'all' || resource.type === selectedType;
    
    return matchesSearch && matchesCategory && matchesType;
  });
  
  // Get unique categories and types for filters
  const categories = ['all', ...new Set(mockDigitalResources.map(resource => resource.category))];
  const types = ['all', ...new Set(mockDigitalResources.map(resource => resource.type))];
  
  // Filter resources by type for tabs
  const pdfResources = filteredResources.filter(resource => resource.type === 'PDF' || resource.type === 'E-Book');
  const videoResources = filteredResources.filter(resource => resource.type === 'Video');
  const audioResources = filteredResources.filter(resource => resource.type === 'Audio');
  const otherResources = filteredResources.filter(resource => 
    !['PDF', 'E-Book', 'Video', 'Audio'].includes(resource.type)
  );
  
  // Function to render resource card
  const renderResourceCard = (resource: typeof mockDigitalResources[0]) => (
    <Card key={resource.id} className="overflow-hidden">
      <div className="aspect-video relative bg-gray-100">
        <img 
          src={resource.thumbnail} 
          alt={resource.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2">
          <Badge 
            variant="outline"
            className={
              resource.type === 'PDF' ? 'bg-blue-100 text-blue-800 border-blue-200' :
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
        <p className="text-sm text-gray-500">{resource.author}</p>
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{resource.category}</span>
          <span className="text-xs">{resource.size}</span>
        </div>
        <p className="text-sm mt-2 line-clamp-2 text-gray-600">{resource.description}</p>
        <div className="flex justify-between mt-4">
          <Button variant="outline" size="sm">
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  );
  
  return (
    <div className="space-y-4">
      {/* Filters */}
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
          </div>
        </CardContent>
      </Card>
      
      {/* Digital Resources Tabs */}
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
        
        {/* All Resources Tab */}
        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredResources.length > 0 ? (
              filteredResources.map(resource => renderResourceCard(resource))
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-500">No resources found matching your criteria.</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* Documents Tab */}
        <TabsContent value="pdf" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {pdfResources.length > 0 ? (
              pdfResources.map(resource => renderResourceCard(resource))
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-500">No document resources found matching your criteria.</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* Videos Tab */}
        <TabsContent value="video" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {videoResources.length > 0 ? (
              videoResources.map(resource => renderResourceCard(resource))
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-500">No video resources found matching your criteria.</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* Audio Tab */}
        <TabsContent value="audio" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {audioResources.length > 0 ? (
              audioResources.map(resource => renderResourceCard(resource))
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-500">No audio resources found matching your criteria.</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* Other Tab */}
        <TabsContent value="other" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {otherResources.length > 0 ? (
              otherResources.map(resource => renderResourceCard(resource))
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-500">No other resources found matching your criteria.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Upload Resource Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button className="fixed bottom-6 right-6 rounded-full h-12 w-12 p-0 shadow-lg">
            <Plus className="h-6 w-6" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Upload Digital Resource</DialogTitle>
            <DialogDescription>
              Add a new digital resource to the library.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" placeholder="Resource title" />
              </div>
              <div>
                <Label htmlFor="author">Author/Creator</Label>
                <Input id="author" placeholder="Author name" />
              </div>
              <div>
                <Label htmlFor="type">Resource Type</Label>
                <Select>
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
                <Select>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
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
              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" placeholder="Brief description of the resource" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="file">Resource File</Label>
                <div className="mt-1 flex items-center">
                  <Button variant="outline" className="w-full">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload File
                  </Button>
                </div>
              </div>
              <div className="col-span-2">
                <Label htmlFor="thumbnail">Thumbnail Image</Label>
                <div className="mt-1 flex items-center">
                  <Button variant="outline" className="w-full">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Thumbnail
                  </Button>
                </div>
              </div>
              <div className="col-span-2">
                <Label htmlFor="url">External URL (Optional)</Label>
                <div className="flex gap-2">
                  <Input id="url" placeholder="https://example.com/resource" className="flex-1" />
                  <Button variant="outline">
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Verify
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Upload Resource</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DigitalLibrary;