"""
Performance Monitoring Service

This service monitors system performance, tracks metrics, and provides insights
for optimization and troubleshooting.
"""

import time
import psutil
import logging
import os
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from app.services.cache_service import get_cache_service
from app.extensions import db
from sqlalchemy import text

logger = logging.getLogger(__name__)

@dataclass
class PerformanceMetric:
    """Data class for performance metrics"""
    name: str
    value: float
    unit: str
    timestamp: datetime
    category: str
    metadata: Dict = None

class PerformanceMonitoringService:
    """Service for monitoring system performance"""
    
    def __init__(self):
        self.cache_service = get_cache_service()
        self.metrics_history: List[PerformanceMetric] = []
        self.max_history_size = 1000
        
    # === SYSTEM METRICS ===
    
    def get_system_metrics(self) -> Dict[str, Any]:
        """Get current system performance metrics"""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            
            # Memory metrics
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            memory_available = memory.available / (1024**3)  # GB
            memory_total = memory.total / (1024**3)  # GB
            
            # Disk metrics
            disk_path = os.path.abspath(os.sep)
            disk = psutil.disk_usage(disk_path)
            disk_percent = disk.percent
            disk_free = disk.free / (1024**3)  # GB
            disk_total = disk.total / (1024**3)  # GB
            
            # Network metrics (if available)
            try:
                network = psutil.net_io_counters()
                network_sent = network.bytes_sent / (1024**2)  # MB
                network_recv = network.bytes_recv / (1024**2)  # MB
            except:
                network_sent = network_recv = 0
            
            metrics = {
                'cpu': {
                    'usage_percent': cpu_percent,
                    'core_count': cpu_count,
                    'status': 'high' if cpu_percent > 80 else 'medium' if cpu_percent > 60 else 'normal'
                },
                'memory': {
                    'usage_percent': memory_percent,
                    'available_gb': round(memory_available, 2),
                    'total_gb': round(memory_total, 2),
                    'status': 'high' if memory_percent > 85 else 'medium' if memory_percent > 70 else 'normal'
                },
                'disk': {
                    'usage_percent': disk_percent,
                    'free_gb': round(disk_free, 2),
                    'total_gb': round(disk_total, 2),
                    'status': 'high' if disk_percent > 90 else 'medium' if disk_percent > 75 else 'normal'
                },
                'network': {
                    'sent_mb': round(network_sent, 2),
                    'received_mb': round(network_recv, 2)
                },
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Store metrics in history
            self._store_metric('cpu_usage', cpu_percent, 'percent', 'system')
            self._store_metric('memory_usage', memory_percent, 'percent', 'system')
            self._store_metric('disk_usage', disk_percent, 'percent', 'system')
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error getting system metrics: {e}")
            return {}
    
    # === DATABASE METRICS ===
    
    def get_database_metrics(self) -> Dict[str, Any]:
        """Get database performance metrics"""
        try:
            start_time = time.time()
            
            # Test database connection speed
            db.session.execute(text("SELECT 1"))
            connection_time = (time.time() - start_time) * 1000  # ms
            
            # Get database size (PostgreSQL specific)
            try:
                result = db.session.execute(text("""
                    SELECT pg_size_pretty(pg_database_size(current_database())) as size,
                           pg_database_size(current_database()) as size_bytes
                """)).fetchone()
                
                db_size = result[0] if result else "Unknown"
                db_size_bytes = result[1] if result else 0
            except:
                db_size = "Unknown"
                db_size_bytes = 0
            
            # Get active connections
            try:
                result = db.session.execute(text("""
                    SELECT count(*) FROM pg_stat_activity 
                    WHERE state = 'active' AND pid <> pg_backend_pid()
                """)).fetchone()
                
                active_connections = result[0] if result else 0
            except:
                active_connections = 0
            
            # Get slow queries (if available)
            try:
                result = db.session.execute(text("""
                    SELECT count(*) FROM pg_stat_activity 
                    WHERE state = 'active' 
                    AND query_start < now() - interval '30 seconds'
                    AND pid <> pg_backend_pid()
                """)).fetchone()
                
                slow_queries = result[0] if result else 0
            except:
                slow_queries = 0
            
            metrics = {
                'connection_time_ms': round(connection_time, 2),
                'database_size': db_size,
                'database_size_bytes': db_size_bytes,
                'active_connections': active_connections,
                'slow_queries': slow_queries,
                'status': 'slow' if connection_time > 100 else 'medium' if connection_time > 50 else 'fast',
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Store metrics
            self._store_metric('db_connection_time', connection_time, 'ms', 'database')
            self._store_metric('db_active_connections', active_connections, 'count', 'database')
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error getting database metrics: {e}")
            return {}
    
    # === CACHE METRICS ===
    
    def get_cache_metrics(self) -> Dict[str, Any]:
        """Get cache performance metrics"""
        try:
            cache_stats = self.cache_service.get_stats()
            
            # Calculate hit rate
            hits = cache_stats.get('hits', 0)
            misses = cache_stats.get('misses', 0)
            total_requests = hits + misses
            hit_rate = (hits / total_requests * 100) if total_requests > 0 else 0
            
            metrics = {
                'hit_rate_percent': round(hit_rate, 2),
                'total_keys': cache_stats.get('keys', 0),
                'memory_usage_mb': cache_stats.get('memory_usage', 0) / (1024**2),
                'hits': hits,
                'misses': misses,
                'total_requests': total_requests,
                'status': 'excellent' if hit_rate > 90 else 'good' if hit_rate > 70 else 'needs_improvement',
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Store metrics
            self._store_metric('cache_hit_rate', hit_rate, 'percent', 'cache')
            self._store_metric('cache_total_keys', cache_stats.get('keys', 0), 'count', 'cache')
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error getting cache metrics: {e}")
            return {}
    
    # === APPLICATION METRICS ===
    
    def get_application_metrics(self) -> Dict[str, Any]:
        """Get application-specific performance metrics"""
        try:
            # Get table row counts for key entities
            table_counts = {}
            tables = ['users', 'students', 'teachers', 'classes', 'grades', 'attendance', 'exams']
            
            for table in tables:
                try:
                    result = db.session.execute(text(f"SELECT COUNT(*) FROM {table}")).fetchone()
                    table_counts[table] = result[0] if result else 0
                except:
                    table_counts[table] = 0
            
            # Calculate some derived metrics
            total_users = table_counts.get('users', 0)
            total_students = table_counts.get('students', 0)
            total_teachers = table_counts.get('teachers', 0)
            
            # Get recent activity (last 24 hours)
            try:
                result = db.session.execute(text("""
                    SELECT COUNT(*) FROM login_history 
                    WHERE login_timestamp > NOW() - INTERVAL '24 hours'
                """)).fetchone()
                recent_logins = result[0] if result else 0
            except:
                recent_logins = 0
            
            metrics = {
                'total_users': total_users,
                'total_students': total_students,
                'total_teachers': total_teachers,
                'recent_logins_24h': recent_logins,
                'table_counts': table_counts,
                'user_distribution': {
                    'students': round((total_students / total_users * 100) if total_users > 0 else 0, 1),
                    'teachers': round((total_teachers / total_users * 100) if total_users > 0 else 0, 1),
                    'others': round(((total_users - total_students - total_teachers) / total_users * 100) if total_users > 0 else 0, 1)
                },
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Store metrics
            self._store_metric('total_users', total_users, 'count', 'application')
            self._store_metric('recent_logins', recent_logins, 'count', 'application')
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error getting application metrics: {e}")
            return {}
    
    # === COMPREHENSIVE PERFORMANCE REPORT ===
    
    def get_performance_report(self) -> Dict[str, Any]:
        """Get comprehensive performance report"""
        try:
            report = {
                'system': self.get_system_metrics(),
                'database': self.get_database_metrics(),
                'cache': self.get_cache_metrics(),
                'application': self.get_application_metrics(),
                'summary': self._generate_performance_summary(),
                'recommendations': self._generate_recommendations(),
                'timestamp': datetime.utcnow().isoformat()
            }
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating performance report: {e}")
            return {}
    
    # === PERFORMANCE ANALYSIS ===
    
    def analyze_performance_trends(self, hours: int = 24) -> Dict[str, Any]:
        """Analyze performance trends over time"""
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            
            # Filter metrics within time range
            recent_metrics = [
                metric for metric in self.metrics_history 
                if metric.timestamp > cutoff_time
            ]
            
            # Group by category and calculate trends
            trends = {}
            categories = set(metric.category for metric in recent_metrics)
            
            for category in categories:
                category_metrics = [m for m in recent_metrics if m.category == category]
                
                if category_metrics:
                    # Calculate average, min, max for each metric name
                    metric_names = set(m.name for m in category_metrics)
                    category_trends = {}
                    
                    for name in metric_names:
                        values = [m.value for m in category_metrics if m.name == name]
                        if values:
                            category_trends[name] = {
                                'average': round(sum(values) / len(values), 2),
                                'min': min(values),
                                'max': max(values),
                                'count': len(values),
                                'trend': self._calculate_trend(values)
                            }
                    
                    trends[category] = category_trends
            
            return {
                'time_range_hours': hours,
                'total_metrics': len(recent_metrics),
                'trends': trends,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error analyzing performance trends: {e}")
            return {}
    
    # === ALERTING ===
    
    def check_performance_alerts(self) -> List[Dict[str, Any]]:
        """Check for performance issues that need attention"""
        alerts = []
        
        try:
            # Get current metrics
            system_metrics = self.get_system_metrics()
            db_metrics = self.get_database_metrics()
            cache_metrics = self.get_cache_metrics()
            
            # Check system alerts
            if system_metrics.get('cpu', {}).get('usage_percent', 0) > 90:
                alerts.append({
                    'type': 'critical',
                    'category': 'system',
                    'message': f"High CPU usage: {system_metrics['cpu']['usage_percent']}%",
                    'recommendation': 'Consider scaling up or optimizing CPU-intensive operations'
                })
            
            if system_metrics.get('memory', {}).get('usage_percent', 0) > 90:
                alerts.append({
                    'type': 'critical',
                    'category': 'system',
                    'message': f"High memory usage: {system_metrics['memory']['usage_percent']}%",
                    'recommendation': 'Consider increasing memory or optimizing memory usage'
                })
            
            # Check database alerts
            if db_metrics.get('connection_time_ms', 0) > 200:
                alerts.append({
                    'type': 'warning',
                    'category': 'database',
                    'message': f"Slow database connection: {db_metrics['connection_time_ms']}ms",
                    'recommendation': 'Check database performance and network connectivity'
                })
            
            if db_metrics.get('slow_queries', 0) > 5:
                alerts.append({
                    'type': 'warning',
                    'category': 'database',
                    'message': f"Multiple slow queries detected: {db_metrics['slow_queries']}",
                    'recommendation': 'Review and optimize slow queries'
                })
            
            # Check cache alerts
            if cache_metrics.get('hit_rate_percent', 0) < 50:
                alerts.append({
                    'type': 'warning',
                    'category': 'cache',
                    'message': f"Low cache hit rate: {cache_metrics['hit_rate_percent']}%",
                    'recommendation': 'Review caching strategy and TTL settings'
                })
            
            return alerts
            
        except Exception as e:
            logger.error(f"Error checking performance alerts: {e}")
            return []
    
    # === UTILITY METHODS ===
    
    def _store_metric(self, name: str, value: float, unit: str, category: str, metadata: Dict = None):
        """Store a performance metric in history"""
        metric = PerformanceMetric(
            name=name,
            value=value,
            unit=unit,
            timestamp=datetime.utcnow(),
            category=category,
            metadata=metadata or {}
        )
        
        self.metrics_history.append(metric)
        
        # Keep history size manageable
        if len(self.metrics_history) > self.max_history_size:
            self.metrics_history = self.metrics_history[-self.max_history_size:]
    
    def _generate_performance_summary(self) -> Dict[str, str]:
        """Generate overall performance summary"""
        try:
            system_metrics = self.get_system_metrics()
            db_metrics = self.get_database_metrics()
            cache_metrics = self.get_cache_metrics()
            
            # Determine overall status
            statuses = [
                system_metrics.get('cpu', {}).get('status', 'unknown'),
                system_metrics.get('memory', {}).get('status', 'unknown'),
                db_metrics.get('status', 'unknown'),
                cache_metrics.get('status', 'unknown')
            ]
            
            if 'high' in statuses or 'slow' in statuses:
                overall_status = 'needs_attention'
            elif 'medium' in statuses or 'needs_improvement' in statuses:
                overall_status = 'moderate'
            else:
                overall_status = 'good'
            
            return {
                'overall_status': overall_status,
                'cpu_status': system_metrics.get('cpu', {}).get('status', 'unknown'),
                'memory_status': system_metrics.get('memory', {}).get('status', 'unknown'),
                'database_status': db_metrics.get('status', 'unknown'),
                'cache_status': cache_metrics.get('status', 'unknown')
            }
            
        except Exception as e:
            logger.error(f"Error generating performance summary: {e}")
            return {'overall_status': 'unknown'}
    
    def _generate_recommendations(self) -> List[str]:
        """Generate performance optimization recommendations"""
        recommendations = []
        
        try:
            alerts = self.check_performance_alerts()
            
            # Add recommendations based on alerts
            for alert in alerts:
                if alert.get('recommendation'):
                    recommendations.append(alert['recommendation'])
            
            # Add general recommendations
            cache_metrics = self.get_cache_metrics()
            if cache_metrics.get('hit_rate_percent', 0) < 80:
                recommendations.append("Consider implementing more aggressive caching strategies")
            
            db_metrics = self.get_database_metrics()
            if db_metrics.get('connection_time_ms', 0) > 50:
                recommendations.append("Consider database query optimization and indexing")
            
            return list(set(recommendations))  # Remove duplicates
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            return []
    
    def _calculate_trend(self, values: List[float]) -> str:
        """Calculate trend direction from a list of values"""
        if len(values) < 2:
            return 'stable'
        
        # Simple trend calculation
        first_half = values[:len(values)//2]
        second_half = values[len(values)//2:]
        
        first_avg = sum(first_half) / len(first_half)
        second_avg = sum(second_half) / len(second_half)
        
        diff_percent = ((second_avg - first_avg) / first_avg * 100) if first_avg != 0 else 0
        
        if diff_percent > 10:
            return 'increasing'
        elif diff_percent < -10:
            return 'decreasing'
        else:
            return 'stable'
    
    def clear_metrics_history(self):
        """Clear stored metrics history"""
        self.metrics_history.clear()
        logger.info("Cleared performance metrics history")
    
    def export_metrics(self, hours: int = 24) -> Dict[str, Any]:
        """Export metrics for external analysis"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        recent_metrics = [
            {
                'name': metric.name,
                'value': metric.value,
                'unit': metric.unit,
                'timestamp': metric.timestamp.isoformat(),
                'category': metric.category,
                'metadata': metric.metadata
            }
            for metric in self.metrics_history 
            if metric.timestamp > cutoff_time
        ]
        
        return {
            'metrics': recent_metrics,
            'export_time': datetime.utcnow().isoformat(),
            'time_range_hours': hours
        }
