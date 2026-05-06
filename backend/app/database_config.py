"""
Database Configuration Optimization
Provides optimized database settings for ADMIPAEDIA
"""

import os
from typing import Dict, Any

class DatabaseOptimizationConfig:
    """
    Database optimization configuration class
    Contains settings for improved performance and scalability
    """
    
    @staticmethod
    def get_sqlalchemy_config() -> Dict[str, Any]:
        """
        Get optimized SQLAlchemy configuration
        
        Returns:
            Dict containing optimized SQLAlchemy settings
        """
        return {
            # Connection Pool Settings
            'pool_size': int(os.getenv('DB_POOL_SIZE', '20')),
            'max_overflow': int(os.getenv('DB_MAX_OVERFLOW', '30')),
            'pool_timeout': int(os.getenv('DB_POOL_TIMEOUT', '30')),
            'pool_recycle': int(os.getenv('DB_POOL_RECYCLE', '3600')),  # 1 hour
            'pool_pre_ping': True,
            
            # Query Optimization
            'echo': os.getenv('SQLALCHEMY_ECHO', 'False').lower() == 'true',
            'echo_pool': os.getenv('SQLALCHEMY_ECHO_POOL', 'False').lower() == 'true',
            
            # Connection Settings
            'connect_args': {
                'connect_timeout': 10,
                'application_name': 'ADMIPAEDIA',
                'options': '-c default_transaction_isolation=read_committed',
                'client_encoding': 'utf8'
            }
        }
    
    @staticmethod
    def get_postgresql_optimizations() -> Dict[str, str]:
        """
        Get PostgreSQL-specific optimization parameters
        
        Returns:
            Dict containing PostgreSQL optimization settings
        """
        return {
            # Memory Settings
            'shared_buffers': '256MB',
            'effective_cache_size': '1GB',
            'work_mem': '4MB',
            'maintenance_work_mem': '64MB',
            
            # Checkpoint Settings
            'checkpoint_completion_target': '0.9',
            'wal_buffers': '16MB',
            'default_statistics_target': '100',
            
            # Query Planner Settings
            'random_page_cost': '1.1',
            'effective_io_concurrency': '200',
            
            # Logging Settings
            'log_min_duration_statement': '1000',  # Log queries > 1 second
            'log_checkpoints': 'on',
            'log_connections': 'on',
            'log_disconnections': 'on',
            'log_lock_waits': 'on',
        }
    
    @staticmethod
    def get_query_optimization_hints() -> Dict[str, str]:
        """
        Get query optimization hints and best practices
        
        Returns:
            Dict containing query optimization guidelines
        """
        return {
            'use_indexes': 'Always use appropriate indexes for WHERE, ORDER BY, and JOIN clauses',
            'limit_results': 'Use LIMIT and OFFSET for pagination to avoid loading large datasets',
            'select_specific': 'Select only required columns instead of using SELECT *',
            'use_joins': 'Use JOINs instead of multiple separate queries when possible',
            'batch_operations': 'Use bulk operations for inserting/updating multiple records',
            'connection_pooling': 'Reuse database connections through connection pooling',
            'query_caching': 'Implement query result caching for frequently accessed data',
            'avoid_n_plus_1': 'Use eager loading to avoid N+1 query problems'
        }

class QueryOptimizer:
    """
    Query optimization utilities
    """
    
    @staticmethod
    def get_optimized_pagination_query(base_query, page: int, per_page: int):
        """
        Get optimized pagination query
        
        Args:
            base_query: Base SQLAlchemy query
            page: Page number (1-based)
            per_page: Items per page
            
        Returns:
            Optimized paginated query
        """
        offset = (page - 1) * per_page
        return base_query.offset(offset).limit(per_page)
    
    @staticmethod
    def get_date_range_filter(query, date_column, start_date, end_date):
        """
        Get optimized date range filter
        
        Args:
            query: SQLAlchemy query
            date_column: Date column to filter
            start_date: Start date
            end_date: End date
            
        Returns:
            Query with optimized date range filter
        """
        return query.filter(
            date_column >= start_date,
            date_column <= end_date
        )
    
    @staticmethod
    def get_bulk_insert_statement(model_class, data_list):
        """
        Get optimized bulk insert statement
        
        Args:
            model_class: SQLAlchemy model class
            data_list: List of dictionaries containing data
            
        Returns:
            Bulk insert statement
        """
        from sqlalchemy import insert
        return insert(model_class).values(data_list)

# Database monitoring and performance tracking
class DatabaseMonitor:
    """
    Database performance monitoring utilities
    """
    
    @staticmethod
    def log_slow_query(query_text: str, execution_time: float, threshold: float = 1.0):
        """
        Log slow queries for performance analysis
        
        Args:
            query_text: SQL query text
            execution_time: Query execution time in seconds
            threshold: Slow query threshold in seconds
        """
        if execution_time > threshold:
            import logging
            logger = logging.getLogger('database.slow_queries')
            logger.warning(
                f"Slow query detected: {execution_time:.2f}s - {query_text[:200]}..."
            )
    
    @staticmethod
    def get_connection_pool_status(engine):
        """
        Get connection pool status for monitoring
        
        Args:
            engine: SQLAlchemy engine
            
        Returns:
            Dict containing pool status information
        """
        pool = engine.pool
        return {
            'pool_size': pool.size(),
            'checked_in': pool.checkedin(),
            'checked_out': pool.checkedout(),
            'overflow': pool.overflow(),
            'invalid': pool.invalid()
        }

# Export configuration
DATABASE_CONFIG = DatabaseOptimizationConfig.get_sqlalchemy_config()
POSTGRESQL_CONFIG = DatabaseOptimizationConfig.get_postgresql_optimizations()
QUERY_HINTS = DatabaseOptimizationConfig.get_query_optimization_hints()