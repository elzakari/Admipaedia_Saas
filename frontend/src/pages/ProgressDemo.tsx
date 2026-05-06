import React, { useState, useEffect } from 'react';
import { Progress } from '../components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

const ProgressDemo = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(66);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Progress Component Demo</h1>
      
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Basic Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Default Progress (66%)</span>
                <span className="text-sm font-medium">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Custom Height</span>
                <span className="text-sm font-medium">40%</span>
              </div>
              <Progress value={40} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Custom Colors</span>
                <span className="text-sm font-medium">80%</span>
              </div>
              <Progress 
                value={80} 
                className="h-3 bg-amber-100 dark:bg-amber-900/20"
                indicatorClassName="bg-gradient-to-r from-amber-500 to-orange-500" 
              />
            </div>
            
            <div className="pt-4">
              <Button onClick={() => setProgress(Math.min(100, progress + 10))}>
                Increase Progress
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setProgress(Math.max(0, progress - 10))}
                className="ml-2"
              >
                Decrease Progress
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => setProgress(0)}
                className="ml-2"
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProgressDemo;