import { useEffect, useRef, useCallback } from 'react';
import { log } from '../utils/logger';
import performanceRegistry from '../services/performanceRegistry';


export const usePerformanceMonitoring = (componentName: string) => {
  const mountTimeRef = useRef<number>();
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef<number>();

  // Track component mount time
  useEffect(() => {
    mountTimeRef.current = performance.now();

    return () => {
      if (mountTimeRef.current) {
        const unmountTime = performance.now();
        const totalMountTime = unmountTime - mountTimeRef.current;

        log.performance(
          `${componentName} total lifecycle`,
          totalMountTime,
          500 // 500ms threshold for component lifecycle
        );

        performanceRegistry.record({
          name: `component_lifecycle_${componentName}`,
          value: totalMountTime,
          timestamp: Date.now(),
          tags: { component: componentName }
        });
      }
    };
  }, [componentName]);

  // Track render performance
  const trackRender = useCallback(() => {
    const renderStart = performance.now();
    renderCountRef.current += 1;

    // Use requestAnimationFrame to measure actual render time
    requestAnimationFrame(() => {
      const renderEnd = performance.now();
      const renderTime = renderEnd - renderStart;

      log.performance(
        `${componentName} render #${renderCountRef.current}`,
        renderTime,
        16 // 16ms threshold (60fps)
      );

      performanceRegistry.record({
        name: `component_render_${componentName}`,
        value: renderTime,
        timestamp: Date.now(),
        tags: {
          component: componentName,
          renderCount: renderCountRef.current.toString()
        }
      });

      lastRenderTimeRef.current = renderTime;
    });
  }, [componentName]);

  // Track expensive operations
  const trackOperation = useCallback((operationName: string, operation: () => void | Promise<void>) => {
    const start = performance.now();

    const result = operation();

    if (result instanceof Promise) {
      return result.finally(() => {
        const end = performance.now();
        log.performance(
          `${componentName}.${operationName}`,
          end - start,
          100 // 100ms threshold for async operations
        );
      });
    } else {
      const end = performance.now();
      log.performance(
        `${componentName}.${operationName}`,
        end - start,
        50 // 50ms threshold for sync operations
      );

      performanceRegistry.record({
        name: `operation_${componentName}_${operationName}`,
        value: end - start,
        timestamp: Date.now(),
        tags: {
          component: componentName,
          operation: operationName
        }
      });
      return result;
    }
  }, [componentName]);

  return {
    trackRender,
    trackOperation,
    getRenderCount: () => renderCountRef.current,
    getLastRenderTime: () => lastRenderTimeRef.current || 0,
  };
};

export default usePerformanceMonitoring;