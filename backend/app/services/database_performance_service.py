"""
Database Performance Monitoring Service
Provides real-time monitoring and optimization recommendations
"""

import time
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy import text, inspect
from sqlalchemy.orm import Session
from app.extensions import db

logger = logging.getLogger(__name__)

class DatabasePerformanceService:
    """
    Service for monitoring and optimizing database performance
    """
    
    def __init__(self):
        self.slow_query_threshold = 1.0  # seconds
        self.query_log = []
        self.performance_metrics = {}
    
    def monitor_query_performance(self, query_func):
        """
        Decorator to monitor query performance
        
        Args:
            query_func: Function executing database query
            
        Returns:
            Decorated function with performance monitoring
        """
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = query_func(*args, **kwargs)
                execution_time = time.time() - start_time
                
                # Log slow queries
                if execution_time > self.slow_query_threshold:
                    self._log_slow_query(query_func.__name__, execution_time)
                
                # Store performance metrics
                self._store_performance_metric(query_func.__name__, execution_time)
                
                return result
            except Exception as e:
                execution_time = time.time() - start_time
                logger.error(f"Query failed after {execution_time:.2f}s: {str(e)}")
                raise
        
        return wrapper
    
    def _log_slow_query(self, query_name: str, execution_time: float):
        """Log slow query for analysis"""
        logger.warning(
            f"Slow query detected: {query_name} took {execution_time:.2f} seconds"
        )
        
        self.query_log.append({
            'query_name': query_name,
            'execution_time': execution_time,
            'timestamp': datetime.utcnow()
        })
    
    def _store_performance_metric(self, query_name: str, execution_time: float):
        """Store performance metrics for analysis"""
        if query_name not in self.performance_metrics:
            self.performance_metrics[query_name] = {
                'total_calls': 0,
                'total_time': 0,
                'avg_time': 0,
                'max_time': 0,
                'min_time': float('inf')
            }
        
        metrics = self.performance_metrics[query_name]
        metrics['total_calls'] += 1
        metrics['total_time'] += execution_time
        metrics['avg_time'] = metrics['total_time'] / metrics['total_calls']
        metrics['max_time'] = max(metrics['max_time'], execution_time)
        metrics['min_time'] = min(metrics['min_time'], execution_time)
    
    def get_performance_report(self) -> Dict[str, Any]:
        """
        Generate comprehensive performance report
        
        Returns:
            Dict containing performance analysis
        """
        return {
            'slow_queries': self._get_slow_queries_summary(),
            'query_metrics': self.performance_metrics,
            'database_stats': self._get_database_statistics(),
            'optimization_recommendations': self._get_optimization_recommendations()
        }
    
    def _get_slow_queries_summary(self) -> List[Dict]:
        """Get summary of slow queries"""
        recent_slow_queries = [
            q for q in self.query_log 
            if q['timestamp'] > datetime.utcnow() - timedelta(hours=24)
        ]
        
        return sorted(
            recent_slow_queries, 
            key=lambda x: x['execution_time'], 
            reverse=True
        )[:10]  # Top 10 slowest queries
    
    def _get_database_statistics(self) -> Dict[str, Any]:
        """Get database statistics"""
        try:
            with db.engine.connect() as conn:
                # Get table sizes
                table_stats = conn.execute(text("""
                    SELECT 
                        schemaname,
                        tablename,
                        attname,
                        n_distinct,
                        correlation
                    FROM pg_stats 
                    WHERE schemaname = 'public'
                    ORDER BY tablename, attname;
                """)).fetchall()
                
                # Get index usage
                index_stats = conn.execute(text("""
                    SELECT 
                        indexrelname,
                        idx_tup_read,
                        idx_tup_fetch
                    FROM pg_stat_user_indexes
                    ORDER BY idx_tup_read DESC;
                """)).fetchall()
                
                return {
                    'table_statistics': [dict(row) for row in table_stats],
                    'index_usage': [dict(row) for row in index_stats]
                }
        except Exception as e:
            logger.error(f"Error getting database statistics: {str(e)}")
            return {}
    
    def _get_optimization_recommendations(self) -> List[str]:
        """Generate optimization recommendations"""
        recommendations = []
        
        # Analyze slow queries
        if len(self.query_log) > 0:
            avg_slow_time = sum(q['execution_time'] for q in self.query_log) / len(self.query_log)
            if avg_slow_time > 2.0:
                recommendations.append(
                    "Consider adding indexes for frequently queried columns"
                )
        
        # Analyze query patterns
        for query_name, metrics in self.performance_metrics.items():
            if metrics['avg_time'] > 1.0:
                recommendations.append(
                    f"Optimize {query_name} - average execution time: {metrics['avg_time']:.2f}s"
                )
        
        # General recommendations
        recommendations.extend([
            "Implement query result caching for frequently accessed data",
            "Use database connection pooling",
            "Consider read replicas for read-heavy operations",
            "Implement proper pagination for large datasets"
        ])
        
        return recommendations
    
    def analyze_missing_indexes(self) -> List[Dict[str, Any]]:
        """
        Analyze potentially missing indexes
        
        Returns:
            List of recommendations for missing indexes
        """
        try:
            with db.engine.connect() as conn:
                # Query to find missing indexes (PostgreSQL specific)
                missing_indexes = conn.execute(text("""
                    SELECT 
                        schemaname,
                        tablename,
                        attname,
                        n_distinct,
                        correlation,
                        most_common_vals
                    FROM pg_stats
                    WHERE schemaname = 'public'
                    AND n_distinct > 100
                    AND correlation < 0.1
                    ORDER BY n_distinct DESC;
                """)).fetchall()
                
                recommendations = []
                for row in missing_indexes:
                    recommendations.append({
                        'table': row.tablename,
                        'column': row.attname,
                        'distinct_values': row.n_distinct,
                        'recommendation': f"Consider adding index on {row.tablename}.{row.attname}"
                    })
                
                return recommendations
        except Exception as e:
            logger.error(f"Error analyzing missing indexes: {str(e)}")
            return []
    
    def optimize_query_plan(self, query_text: str) -> Dict[str, Any]:
        """
        Analyze query execution plan and provide optimization suggestions
        
        Args:
            query_text: SQL query to analyze
            
        Returns:
            Dict containing query plan analysis and suggestions
        """
        try:
            with db.engine.connect() as conn:
                # Get query execution plan
                explain_result = conn.execute(
                    text(f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query_text}")
                ).fetchone()
                
                plan = explain_result[0][0] if explain_result else {}
                
                # Analyze plan for optimization opportunities
                suggestions = self._analyze_execution_plan(plan)
                
                return {
                    'execution_plan': plan,
                    'optimization_suggestions': suggestions
                }
        except Exception as e:
            logger.error(f"Error analyzing query plan: {str(e)}")
            return {'error': str(e)}
    
    def _analyze_execution_plan(self, plan: Dict) -> List[str]:
        """Analyze execution plan and generate suggestions"""
        suggestions = []
        
        if 'Plan' in plan:
            node = plan['Plan']
            
            # Check for sequential scans
            if node.get('Node Type') == 'Seq Scan':
                suggestions.append(
                    f"Sequential scan detected on {node.get('Relation Name', 'unknown table')}. "
                    "Consider adding an index."
                )
            
            # Check for high cost operations
            if node.get('Total Cost', 0) > 1000:
                suggestions.append(
                    "High cost operation detected. Consider query optimization."
                )
            
            # Check for nested loops with high row counts
            if (node.get('Node Type') == 'Nested Loop' and 
                node.get('Actual Rows', 0) > 10000):
                suggestions.append(
                    "Nested loop with high row count. Consider using hash join instead."
                )
        
        return suggestions

# Global instance
db_performance_service = DatabasePerformanceService()