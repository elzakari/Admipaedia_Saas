import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export interface BulkOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'assign' | 'export';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  total: number;
  processed: number;
  failed: number;
  errors: string[];
  data?: any;
  startTime?: Date;
  endTime?: Date;
}

export interface BulkOperationConfig {
  batchSize?: number;
  maxRetries?: number;
  retryDelay?: number;
  onProgress?: (operation: BulkOperation) => void;
  onComplete?: (operation: BulkOperation) => void;
  onError?: (operation: BulkOperation, error: string) => void;
}

export interface UseBulkOperationsReturn {
  operations: BulkOperation[];
  isProcessing: boolean;
  startOperation: (type: BulkOperation['type'], data: any[], config?: BulkOperationConfig) => Promise<string>;
  cancelOperation: (operationId: string) => void;
  retryOperation: (operationId: string) => Promise<void>;
  clearOperation: (operationId: string) => void;
  clearAllOperations: () => void;
  getOperationById: (operationId: string) => BulkOperation | undefined;
  undoOperation: (operationId: string) => Promise<void>;
}

const DEFAULT_CONFIG: Required<BulkOperationConfig> = {
  batchSize: 10,
  maxRetries: 3,
  retryDelay: 1000,
  onProgress: () => {},
  onComplete: () => {},
  onError: () => {},
};

export const useBulkOperations = (): UseBulkOperationsReturn => {
  const [operations, setOperations] = useState<BulkOperation[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const operationRefs = useRef<Map<string, AbortController>>(new Map());
  const undoStackRef = useRef<Map<string, any[]>>(new Map());

  const isProcessing = operations.some(op => op.status === 'processing');

  const generateOperationId = useCallback(() => {
    return `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const updateOperation = useCallback((operationId: string, updates: Partial<BulkOperation>) => {
    setOperations(prev => prev.map(op => 
      op.id === operationId ? { ...op, ...updates } : op
    ));
  }, []);

  const processBatch = async (
    items: any[],
    processor: (item: any) => Promise<any>,
    batchSize: number,
    operationId: string,
    abortController: AbortController
  ): Promise<{ results: any[], errors: string[] }> => {
    const results: any[] = [];
    const errors: string[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      if (abortController.signal.aborted) {
        throw new Error('Operation cancelled');
      }

      const batch = items.slice(i, i + batchSize);
      const batchPromises = batch.map(async (item, index) => {
        try {
          const result = await processor(item);
          results.push(result);
          return { success: true, result, item };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Item ${i + index + 1}: ${errorMessage}`);
          return { success: false, error: errorMessage, item };
        }
      });

      await Promise.allSettled(batchPromises);
      
      // Update progress
      const processed = Math.min(i + batchSize, items.length);
      updateOperation(operationId, {
        processed,
        progress: Math.round((processed / items.length) * 100),
        failed: errors.length
      });

      // Small delay between batches to prevent overwhelming the server
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return { results, errors };
  };

  const startOperation = useCallback(async (
    type: BulkOperation['type'],
    data: any[],
    config: BulkOperationConfig = {}
  ): Promise<string> => {
    const operationId = generateOperationId();
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const abortController = new AbortController();
    
    operationRefs.current.set(operationId, abortController);

    const operation: BulkOperation = {
      id: operationId,
      type,
      status: 'processing',
      progress: 0,
      total: data.length,
      processed: 0,
      failed: 0,
      errors: [],
      data,
      startTime: new Date()
    };

    setOperations(prev => [...prev, operation]);

    try {
      let processor: (item: any) => Promise<any>;
      let undoData: any[] = [];

      // Define processors based on operation type
      switch (type) {
        case 'create':
          processor = async (item) => {
            // This will be implemented by specific services
            throw new Error('Create processor not implemented');
          };
          break;
        case 'update':
          processor = async (item) => {
            // Store original data for undo
            undoData.push({ id: item.id, original: item.original });
            // This will be implemented by specific services
            throw new Error('Update processor not implemented');
          };
          break;
        case 'delete':
          processor = async (item) => {
            // Store deleted data for undo
            undoData.push(item);
            // This will be implemented by specific services
            throw new Error('Delete processor not implemented');
          };
          break;
        case 'assign':
          processor = async (item) => {
            // This will be implemented by specific services
            throw new Error('Assign processor not implemented');
          };
          break;
        case 'export':
          processor = async (item) => {
            // This will be implemented by specific services
            throw new Error('Export processor not implemented');
          };
          break;
        default:
          throw new Error(`Unknown operation type: ${type}`);
      }

      const { results, errors } = await processBatch(
        data,
        processor,
        finalConfig.batchSize,
        operationId,
        abortController
      );

      // Store undo data
      if (undoData.length > 0) {
        undoStackRef.current.set(operationId, undoData);
      }

      const finalOperation: Partial<BulkOperation> = {
        status: errors.length === 0 ? 'completed' : (results.length > 0 ? 'completed' : 'failed'),
        progress: 100,
        errors,
        endTime: new Date()
      };

      updateOperation(operationId, finalOperation);

      // Show completion toast
      if (errors.length === 0) {
        toast({
          title: "Bulk Operation Completed",
          description: `Successfully processed ${results.length} items.`,
        });
        finalConfig.onComplete(operation);
      } else {
        toast({
          title: "Bulk Operation Completed with Errors",
          description: `Processed ${results.length} items, ${errors.length} failed.`,
          variant: "destructive"
        });
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['bulk-operation'] });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateOperation(operationId, {
        status: error.message === 'Operation cancelled' ? 'cancelled' : 'failed',
        errors: [errorMessage],
        endTime: new Date()
      });

      toast({
        title: "Bulk Operation Failed",
        description: errorMessage,
        variant: "destructive"
      });

      finalConfig.onError(operation, errorMessage);
    } finally {
      operationRefs.current.delete(operationId);
    }

    return operationId;
  }, [generateOperationId, updateOperation, toast, queryClient]);

  const cancelOperation = useCallback((operationId: string) => {
    const abortController = operationRefs.current.get(operationId);
    if (abortController) {
      abortController.abort();
      updateOperation(operationId, { status: 'cancelled', endTime: new Date() });
      toast({
        title: "Operation Cancelled",
        description: "The bulk operation has been cancelled.",
      });
    }
  }, [updateOperation, toast]);

  const retryOperation = useCallback(async (operationId: string) => {
    const operation = operations.find(op => op.id === operationId);
    if (!operation || !operation.data) {
      toast({
        title: "Retry Failed",
        description: "Operation data not found.",
        variant: "destructive"
      });
      return;
    }

    // Remove the failed operation and start a new one
    setOperations(prev => prev.filter(op => op.id !== operationId));
    await startOperation(operation.type, operation.data);
  }, [operations, startOperation, toast]);

  const clearOperation = useCallback((operationId: string) => {
    setOperations(prev => prev.filter(op => op.id !== operationId));
    undoStackRef.current.delete(operationId);
  }, []);

  const clearAllOperations = useCallback(() => {
    setOperations([]);
    undoStackRef.current.clear();
  }, []);

  const getOperationById = useCallback((operationId: string) => {
    return operations.find(op => op.id === operationId);
  }, [operations]);

  const undoOperation = useCallback(async (operationId: string) => {
    const undoData = undoStackRef.current.get(operationId);
    const operation = operations.find(op => op.id === operationId);
    
    if (!undoData || !operation) {
      toast({
        title: "Undo Failed",
        description: "No undo data available for this operation.",
        variant: "destructive"
      });
      return;
    }

    try {
      // This would need to be implemented by specific services
      // For now, we'll just show a placeholder
      toast({
        title: "Undo Not Implemented",
        description: "Undo functionality is not yet implemented for this operation type.",
        variant: "destructive"
      });
    } catch (error) {
      toast({
        title: "Undo Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
  }, [operations, toast]);

  return {
    operations,
    isProcessing,
    startOperation,
    cancelOperation,
    retryOperation,
    clearOperation,
    clearAllOperations,
    getOperationById,
    undoOperation
  };
};

// Utility function to create operation-specific hooks
export const createBulkOperationHook = <T>(
  operationType: BulkOperation['type'],
  processor: (item: T) => Promise<any>,
  defaultConfig?: BulkOperationConfig
) => {
  return () => {
    const bulkOps = useBulkOperations();
    
    const executeOperation = useCallback(async (
      items: T[],
      config?: BulkOperationConfig
    ) => {
      const finalConfig = { ...defaultConfig, ...config };
      return bulkOps.startOperation(operationType, items, finalConfig);
    }, [bulkOps]);

    return {
      ...bulkOps,
      executeOperation
    };
  };
};