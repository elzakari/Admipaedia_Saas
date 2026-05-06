// Enhance the existing StudentImportExport component
import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useToast } from "../ui/use-toast";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Progress } from "../ui/progress";
import { AlertCircle, CheckCircle, Download, Upload, FileText, Settings } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { getErrorMessage } from '@/utils/errorHandling';
import studentService from '@/services/studentService';

export function StudentImportExport() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('import');
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any>(null);
  const [exportFields, setExportFields] = useState<string[]>(['id', 'admission_number', 'first_name', 'last_name', 'email', 'class_id']);
  const [exportFormat, setExportFormat] = useState('csv');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Available fields for export
  const availableFields = [
    { id: 'id', label: 'ID' },
    { id: 'admission_number', label: 'Admission Number' },
    { id: 'first_name', label: 'First Name' },
    { id: 'last_name', label: 'Last Name' },
    { id: 'middle_name', label: 'Middle Name' },
    { id: 'email', label: 'Email' },
    { id: 'phone', label: 'Phone' },
    { id: 'date_of_birth', label: 'Date of Birth' },
    { id: 'gender', label: 'Gender' },
    { id: 'address', label: 'Address' },
    { id: 'class_id', label: 'Class' },
    { id: 'status', label: 'Status' },
    // Add more fields as needed
  ];
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  
  const handleImport = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to import",
        variant: "destructive",
        id: ''
      });
      return;
    }
    
    setImporting(true);
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 92) return prev;
        return prev + 4;
      });
    }, 220);
    
    try {
      const result = await studentService.importStudents(file);
      clearInterval(interval);
      setProgress(100);

      const errorDetails = Array.isArray(result.errors) ? result.errors : [];
      setResults({
        success: true,
        imported: result.imported,
        errors: errorDetails.length,
        errorDetails
      });
      
      toast({
        title: "Import completed",
        description: `Imported ${result.imported} students with ${errorDetails.length} errors`,
        variant: "default",
        id: ''
      });
    } catch (error) {
      clearInterval(interval);
      toast({
        title: "Import failed",
        description: getErrorMessage(error),
        variant: "destructive",
        id: ''
      });
    } finally {
      clearInterval(interval);
      setImporting(false);
    }
  };
  
  const handleExport = async () => {
    if (exportFields.length === 0) {
      toast({
        title: "No fields selected",
        description: "Please select at least one field to export",
        variant: "destructive",
        id: ''
      });
      return;
    }
    
    try {
      if (exportFormat !== 'csv') {
        toast({
          title: "Export format not supported",
          description: "Only CSV export is available right now",
          variant: "default",
          id: ''
        });
        return;
      }

      const blob = await studentService.exportStudents({
        fields: exportFields
      } as any);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `students_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `Students data has been exported as CSV`,
        variant: "default",
        id: ''
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: getErrorMessage(error),
        variant: "destructive",
        id: ''
      });
    }
  };
  
  const toggleField = (field: string) => {
    setExportFields(prev => 
      prev.includes(field) 
        ? prev.filter((f: string) => f !== field) 
        : [...prev, field]
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Data Import/Export</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">Import Students</TabsTrigger>
            <TabsTrigger value="export">Export Students</TabsTrigger>
          </TabsList>
          
          <TabsContent value="import" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileChange} 
                  className="flex-1"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Browse
                </Button>
              </div>
              
              {file && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span>{file.name}</span>
                  <span className="text-sm text-muted-foreground">({Math.round(file.size / 1024)} KB)</span>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <Button 
                  onClick={handleImport} 
                  disabled={!file || importing}
                >
                  {importing ? 'Importing...' : 'Start Import'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => window.open('/sample_data/student_import_template.csv')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
              
              {importing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Importing students...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}
              
              {results && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-2">
                    {results.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="font-medium">
                      {results.success 
                        ? `Successfully imported ${results.imported} students` 
                        : 'Import failed'}
                    </span>
                  </div>
                  
                  {results.errors > 0 && (
                    <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        <span className="font-medium text-amber-800">
                          {results.errors} errors found
                        </span>
                      </div>
                      <ul className="space-y-1 text-sm text-amber-800">
                        {results.errorDetails.map((error: any, index: number) => (
                          <li key={index}>
                            {(() => {
                              const row = error.row ?? error.row_number ?? error.line ?? error.index;
                              const msg = error.message ?? error.error ?? error.reason;
                              if (row !== undefined && msg) return `Row ${row}: ${msg}`;
                              if (msg) return msg;
                              try {
                                return JSON.stringify(error);
                              } catch {
                                return String(error);
                              }
                            })()}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="export" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Export Format</Label>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="mb-2 block">Select Fields to Export</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {availableFields.map(field => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`field-${field.id}`} 
                        checked={exportFields.includes(field.id)}
                        onCheckedChange={() => toggleField(field.id)}
                      />
                      <label 
                        htmlFor={`field-${field.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {field.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <Button onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export Students
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
