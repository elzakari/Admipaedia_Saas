"""
Enhanced security features for ADMIPAEDIA system
Implements advanced threat detection, IP geolocation, and security monitoring
"""

import re
import json
import time
import hashlib
import requests
from typing import Dict, List, Optional, Tuple, Set
from datetime import datetime, timedelta
from collections import defaultdict, deque
from dataclasses import dataclass
from flask import request, current_app
import structlog
from app.extensions import db
from app.models.user import User
from app.models.security import LoginAttempt

logger = structlog.get_logger()

@dataclass
class SecurityThreat:
    """Data class for security threat information"""
    threat_type: str
    severity: str  # low, medium, high, critical
    description: str
    ip_address: str
    user_agent: str
    timestamp: datetime
    details: Dict

class AdvancedThreatDetector:
    """Advanced threat detection system"""
    
    # Suspicious patterns for different attack types
    SQL_INJECTION_PATTERNS = [
        r"(\bunion\b.*\bselect\b)|(\bselect\b.*\bunion\b)",
        r"\b(drop|delete|insert|update)\s+(table|database|schema)\b",
        r"(\bor\b|\band\b)\s+\d+\s*=\s*\d+",
        r"(\bor\b|\band\b)\s+['\"]?\w+['\"]?\s*=\s*['\"]?\w+['\"]?",
        r"(--|#|\/\*|\*\/)",
        r"\b(exec|execute|sp_|xp_)\b",
        r"(\bchar\b|\bascii\b|\bsubstring\b).*\(",
        r"\b(waitfor|delay)\b.*\d+",
    ]
    
    XSS_PATTERNS = [
        r"<script[^>]*>.*?</script>",
        r"javascript:",
        r"vbscript:",
        r"onload\s*=",
        r"onerror\s*=",
        r"onclick\s*=",
        r"onmouseover\s*=",
        r"<iframe[^>]*>",
        r"<object[^>]*>",
        r"<embed[^>]*>",
        r"<link[^>]*>",
        r"<meta[^>]*>",
        r"expression\s*\(",
        r"@import",
        r"url\s*\(",
    ]
    
    COMMAND_INJECTION_PATTERNS = [
        r"[;&|`$(){}[\]\\]",
        r"\b(cat|ls|pwd|whoami|id|uname|ps|netstat|ifconfig)\b",
        r"\b(rm|mv|cp|chmod|chown|kill|killall)\b",
        r"\b(wget|curl|nc|telnet|ssh|ftp)\b",
        r"(\|\||&&|;|\||&)",
        r"(\$\(|\`)",
    ]
    
    SUSPICIOUS_USER_AGENTS = [
        r"sqlmap",
        r"nikto",
        r"nmap",
        r"burp",
        r"zap",
        r"acunetix",
        r"nessus",
        r"openvas",
        r"w3af",
        r"havij",
        r"pangolin",
        r"webscarab",
        r"paros",
        r"dirbuster",
        r"dirb",
        r"gobuster",
        r"wfuzz",
        r"ffuf",
    ]
    
    def __init__(self):
        self.threat_cache = defaultdict(list)
        self.ip_reputation_cache = {}
        self.cache_ttl = 3600  # 1 hour
        
    def analyze_request(self, request_data: Dict) -> List[SecurityThreat]:
        """Analyze incoming request for security threats"""
        threats = []
        ip_address = request_data.get('ip_address', '')
        user_agent = request_data.get('user_agent', '')
        payload = request_data.get('payload', '')
        headers = request_data.get('headers', {})
        
        # Check for SQL injection
        sql_threats = self._detect_sql_injection(payload, ip_address, user_agent)
        threats.extend(sql_threats)
        
        # Check for XSS
        xss_threats = self._detect_xss(payload, ip_address, user_agent)
        threats.extend(xss_threats)
        
        # Check for command injection
        cmd_threats = self._detect_command_injection(payload, ip_address, user_agent)
        threats.extend(cmd_threats)
        
        # Check suspicious user agents
        ua_threats = self._detect_suspicious_user_agent(user_agent, ip_address)
        threats.extend(ua_threats)
        
        # Check for directory traversal
        traversal_threats = self._detect_directory_traversal(payload, ip_address, user_agent)
        threats.extend(traversal_threats)
        
        # Check for suspicious headers
        header_threats = self._detect_suspicious_headers(headers, ip_address, user_agent)
        threats.extend(header_threats)
        
        return threats
    
    def _detect_sql_injection(self, payload: str, ip: str, ua: str) -> List[SecurityThreat]:
        """Detect SQL injection attempts"""
        threats = []
        payload_lower = payload.lower()
        
        for pattern in self.SQL_INJECTION_PATTERNS:
            if re.search(pattern, payload_lower, re.IGNORECASE):
                threats.append(SecurityThreat(
                    threat_type="sql_injection",
                    severity="high",
                    description=f"SQL injection pattern detected: {pattern}",
                    ip_address=ip,
                    user_agent=ua,
                    timestamp=datetime.utcnow(),
                    details={"pattern": pattern, "payload_sample": payload[:200]}
                ))
                break
        
        return threats
    
    def _detect_xss(self, payload: str, ip: str, ua: str) -> List[SecurityThreat]:
        """Detect XSS attempts"""
        threats = []
        
        for pattern in self.XSS_PATTERNS:
            if re.search(pattern, payload, re.IGNORECASE):
                threats.append(SecurityThreat(
                    threat_type="xss",
                    severity="medium",
                    description=f"XSS pattern detected: {pattern}",
                    ip_address=ip,
                    user_agent=ua,
                    timestamp=datetime.utcnow(),
                    details={"pattern": pattern, "payload_sample": payload[:200]}
                ))
                break
        
        return threats
    
    def _detect_command_injection(self, payload: str, ip: str, ua: str) -> List[SecurityThreat]:
        """Detect command injection attempts"""
        threats = []
        
        for pattern in self.COMMAND_INJECTION_PATTERNS:
            if re.search(pattern, payload, re.IGNORECASE):
                threats.append(SecurityThreat(
                    threat_type="command_injection",
                    severity="critical",
                    description=f"Command injection pattern detected: {pattern}",
                    ip_address=ip,
                    user_agent=ua,
                    timestamp=datetime.utcnow(),
                    details={"pattern": pattern, "payload_sample": payload[:200]}
                ))
                break
        
        return threats
    
    def _detect_suspicious_user_agent(self, user_agent: str, ip: str) -> List[SecurityThreat]:
        """Detect suspicious user agents"""
        threats = []
        ua_lower = user_agent.lower()
        
        for pattern in self.SUSPICIOUS_USER_AGENTS:
            if re.search(pattern, ua_lower):
                threats.append(SecurityThreat(
                    threat_type="suspicious_user_agent",
                    severity="medium",
                    description=f"Suspicious user agent detected: {pattern}",
                    ip_address=ip,
                    user_agent=user_agent,
                    timestamp=datetime.utcnow(),
                    details={"pattern": pattern, "full_user_agent": user_agent}
                ))
                break
        
        return threats
    
    def _detect_directory_traversal(self, payload: str, ip: str, ua: str) -> List[SecurityThreat]:
        """Detect directory traversal attempts"""
        threats = []
        traversal_patterns = [
            r"\.\.\/",
            r"\.\.\\",
            r"%2e%2e%2f",
            r"%2e%2e%5c",
            r"..%2f",
            r"..%5c",
        ]
        
        for pattern in traversal_patterns:
            if re.search(pattern, payload, re.IGNORECASE):
                threats.append(SecurityThreat(
                    threat_type="directory_traversal",
                    severity="high",
                    description=f"Directory traversal pattern detected: {pattern}",
                    ip_address=ip,
                    user_agent=ua,
                    timestamp=datetime.utcnow(),
                    details={"pattern": pattern, "payload_sample": payload[:200]}
                ))
                break
        
        return threats
    
    def _detect_suspicious_headers(self, headers: Dict, ip: str, ua: str) -> List[SecurityThreat]:
        """Detect suspicious HTTP headers"""
        threats = []
        suspicious_headers = {
            'x-forwarded-for': r'(\d{1,3}\.){3}\d{1,3}(,\s*(\d{1,3}\.){3}\d{1,3}){5,}',  # Too many IPs
            'x-real-ip': r'(127\.0\.0\.1|localhost|0\.0\.0\.0)',  # Suspicious IPs
            'user-agent': r'^$',  # Empty user agent
        }
        
        for header, pattern in suspicious_headers.items():
            header_value = headers.get(header, '')
            if re.search(pattern, header_value, re.IGNORECASE):
                threats.append(SecurityThreat(
                    threat_type="suspicious_headers",
                    severity="low",
                    description=f"Suspicious header detected: {header}",
                    ip_address=ip,
                    user_agent=ua,
                    timestamp=datetime.utcnow(),
                    details={"header": header, "value": header_value}
                ))
        
        return threats

class IPGeolocationService:
    """IP geolocation and reputation service"""
    
    def __init__(self):
        self.cache = {}
        self.cache_ttl = 86400  # 24 hours
        
    def get_ip_info(self, ip_address: str) -> Dict:
        """Get IP geolocation and reputation information"""
        # Check if it's a local/loopback address
        if ip_address in ('127.0.0.1', 'localhost', '::1', '0.0.0.0'):
            return {
                'ip': ip_address,
                'country': 'Local',
                'city': 'Local',
                'isp': 'Internal Network',
                'is_vpn': False,
                'is_proxy': False,
                'is_tor': False,
                'reputation_score': 0,
                'threat_types': []
            }

        # Check cache first
        cache_key = f"ip_info_{ip_address}"
        if cache_key in self.cache:
            cached_data, timestamp = self.cache[cache_key]
            if time.time() - timestamp < self.cache_ttl:
                return cached_data
        
        # Get IP info from multiple sources
        ip_info = {
            'ip': ip_address,
            'country': 'Unknown',
            'city': 'Unknown',
            'isp': 'Unknown',
            'is_vpn': False,
            'is_proxy': False,
            'is_tor': False,
            'reputation_score': 0,
            'threat_types': []
        }
        
        # Skip geolocation for local IP addresses
        if not ip_address or ip_address in ['127.0.0.1', 'localhost', '::1', '0.0.0.0']:
            return {
                'country': 'Local',
                'city': 'Local',
                'is_suspicious': False
            }
            
        try:
            # Use ipapi.co for basic geolocation (free tier)
            response = requests.get(f'https://ipapi.co/{ip_address}/json/', timeout=5)
            if response.status_code == 200:
                data = response.json()
                ip_info.update({
                    'country': data.get('country_name', 'Unknown'),
                    'city': data.get('city', 'Unknown'),
                    'isp': data.get('org', 'Unknown'),
                })
        except Exception as e:
            logger.warning("ip_geolocation_failed", ip=ip_address, error=str(e))
        
        # Check against known malicious IP lists
        ip_info.update(self._check_ip_reputation(ip_address))
        
        # Cache the result
        self.cache[cache_key] = (ip_info, time.time())
        
        return ip_info
    
    def _check_ip_reputation(self, ip_address: str) -> Dict:
        """Check IP reputation against threat intelligence feeds"""
        reputation_info = {
            'reputation_score': 0,
            'threat_types': [],
            'is_vpn': False,
            'is_proxy': False,
            'is_tor': False
        }
        
        # Check against common VPN/Proxy ranges (simplified)
        vpn_ranges = [
            '10.0.0.0/8',
            '172.16.0.0/12',
            '192.168.0.0/16',
            '127.0.0.0/8'
        ]
        
        # This is a simplified check - in production, use proper threat intelligence APIs
        if any(self._ip_in_range(ip_address, range_) for range_ in vpn_ranges):
            reputation_info['is_proxy'] = True
            reputation_info['reputation_score'] = 30
        
        return reputation_info
    
    def _ip_in_range(self, ip: str, cidr: str) -> bool:
        """Check if IP is in CIDR range (simplified implementation)"""
        try:
            import ipaddress
            return ipaddress.ip_address(ip) in ipaddress.ip_network(cidr)
        except:
            return False

class SecurityMonitor:
    """Real-time security monitoring and alerting"""
    
    def __init__(self):
        self.threat_detector = AdvancedThreatDetector()
        self.geolocation_service = IPGeolocationService()
        self.alert_thresholds = {
            'failed_logins': 5,
            'threats_per_ip': 10,
            'suspicious_countries': ['CN', 'RU', 'KP'],  # Configurable
            'time_window': 300  # 5 minutes
        }
        
    def monitor_request(self, request_obj) -> Dict:
        """Monitor incoming request for security threats"""
        ip_address = request_obj.remote_addr
        user_agent = request_obj.headers.get('User-Agent', '')
        
        # Prepare request data for analysis
        request_data = {
            'ip_address': ip_address,
            'user_agent': user_agent,
            'payload': self._extract_payload(request_obj),
            'headers': dict(request_obj.headers),
            'method': request_obj.method,
            'endpoint': request_obj.endpoint,
            'timestamp': datetime.utcnow()
        }
        
        # Analyze for threats
        threats = self.threat_detector.analyze_request(request_data)
        
        # Get IP information
        ip_info = self.geolocation_service.get_ip_info(ip_address)
        
        # Log security events
        if threats:
            self._log_security_threats(threats, ip_info)
        
        # Check for alert conditions
        alerts = self._check_alert_conditions(ip_address, threats, ip_info)
        
        return {
            'threats': threats,
            'ip_info': ip_info,
            'alerts': alerts,
            'risk_score': self._calculate_risk_score(threats, ip_info)
        }
    
    def _extract_payload(self, request_obj) -> str:
        """Extract payload from request for analysis without consuming the stream"""
        payload_parts = []
        
        # Add query parameters (safe, doesn't consume stream)
        if request_obj.args:
            payload_parts.append(str(request_obj.args))
        
        # For JSON/Form data, we should only access them if they've already been parsed
        # or if we're sure it won't break the subsequent route handler.
        # In Flask, request.get_json(silent=True) is usually safe if already parsed.
        
        return ' '.join(payload_parts)
    
    def _log_security_threats(self, threats: List[SecurityThreat], ip_info: Dict):
        """Log security threats for monitoring"""
        for threat in threats:
            logger.warning(
                "security_threat_detected",
                threat_type=threat.threat_type,
                severity=threat.severity,
                description=threat.description,
                ip_address=threat.ip_address,
                country=ip_info.get('country'),
                city=ip_info.get('city'),
                isp=ip_info.get('isp'),
                reputation_score=ip_info.get('reputation_score'),
                details=threat.details
            )
    
    def _check_alert_conditions(self, ip_address: str, threats: List[SecurityThreat], ip_info: Dict) -> List[Dict]:
        """Check if any alert conditions are met"""
        alerts = []
        
        # High severity threats
        critical_threats = [t for t in threats if t.severity == 'critical']
        if critical_threats:
            alerts.append({
                'type': 'critical_threat',
                'message': f'Critical security threat detected from {ip_address}',
                'details': {'threat_count': len(critical_threats)}
            })
        
        # Suspicious country
        country_code = ip_info.get('country_code', '')
        if country_code in self.alert_thresholds['suspicious_countries']:
            alerts.append({
                'type': 'suspicious_country',
                'message': f'Request from suspicious country: {country_code}',
                'details': {'country': ip_info.get('country')}
            })
        
        # High reputation score (indicating malicious IP)
        if ip_info.get('reputation_score', 0) > 70:
            alerts.append({
                'type': 'malicious_ip',
                'message': f'Request from known malicious IP: {ip_address}',
                'details': {'reputation_score': ip_info.get('reputation_score')}
            })
        
        return alerts
    
    def _calculate_risk_score(self, threats: List[SecurityThreat], ip_info: Dict) -> int:
        """Calculate overall risk score for the request"""
        risk_score = 0
        
        # Base score from threats
        severity_scores = {'low': 10, 'medium': 25, 'high': 50, 'critical': 100}
        for threat in threats:
            risk_score += severity_scores.get(threat.severity, 0)
        
        # Add IP reputation score
        risk_score += ip_info.get('reputation_score', 0)
        
        # Add VPN/Proxy penalty
        if ip_info.get('is_vpn') or ip_info.get('is_proxy'):
            risk_score += 20
        
        # Add Tor penalty
        if ip_info.get('is_tor'):
            risk_score += 50
        
        return min(risk_score, 100)  # Cap at 100

# Global security monitor instance
security_monitor = SecurityMonitor()

class DeviceFingerprinting:
    """Device fingerprinting for enhanced security"""
    
    @staticmethod
    def generate_fingerprint(request_obj) -> str:
        """Generate a unique device fingerprint"""
        components = [
            request_obj.headers.get('User-Agent', ''),
            request_obj.headers.get('Accept-Language', ''),
            request_obj.headers.get('Accept-Encoding', ''),
            request_obj.headers.get('Accept', ''),
            request_obj.headers.get('Connection', ''),
            request_obj.headers.get('Upgrade-Insecure-Requests', ''),
            request_obj.headers.get('Sec-Fetch-Site', ''),
            request_obj.headers.get('Sec-Fetch-Mode', ''),
            request_obj.headers.get('Sec-Fetch-User', ''),
            request_obj.headers.get('Sec-Fetch-Dest', ''),
        ]
        
        # Create fingerprint hash
        fingerprint_string = '|'.join(filter(None, components))
        return hashlib.sha256(fingerprint_string.encode()).hexdigest()[:32]
    
    @staticmethod
    def is_trusted_device(fingerprint: str, user_id: int) -> bool:
        """Check if device is trusted for the user"""
        from app.models.enhanced_auth import TrustedDevice
        
        trusted_device = TrustedDevice.query.filter_by(
            user_id=user_id,
            device_fingerprint=fingerprint,
            is_active=True
        ).first()
        
        return trusted_device is not None

class ThreatDetection:
    """Threat detection utilities"""
    
    @staticmethod
    def analyze_login_pattern(identifier: str, ip_address: str) -> Dict:
        """Analyze login patterns for anomalies"""
        try:
            from app.models.security import LoginAttempt
            
            # Get recent login attempts
            # Use identifier (email) for LoginAttempt
            recent_attempts = LoginAttempt.query.filter_by(
                identifier=identifier
            ).filter(
                LoginAttempt.attempted_at >= datetime.utcnow() - timedelta(days=30)
            ).order_by(LoginAttempt.attempted_at.desc()).limit(50).all()
            
            if not recent_attempts:
                return {'risk_level': 'low', 'anomalies': []}
            
            anomalies = []
            
            # Check for unusual IP addresses
            recent_ips = [attempt.ip_address for attempt in recent_attempts[:10]]
            if ip_address not in recent_ips:
                anomalies.append('new_ip_address')
            
            # Check for unusual timing patterns
            login_hours = [attempt.attempted_at.hour for attempt in recent_attempts]
            current_hour = datetime.utcnow().hour
            if current_hour not in login_hours:
                anomalies.append('unusual_time')
            
            # Determine risk level
            risk_level = 'high' if len(anomalies) >= 2 else 'medium' if anomalies else 'low'
            
            return {
                'risk_level': risk_level,
                'anomalies': anomalies,
                'recent_ips': list(set(recent_ips)),
                'typical_hours': list(set(login_hours))
            }
        except Exception as e:
            logger.error("analyze_login_pattern_error", error=str(e))
            # Default to low risk if analysis fails to avoid blocking legitimate users during errors
            return {'risk_level': 'low', 'anomalies': []}

def enhanced_security_middleware():
    """Enhanced security middleware decorator"""
    def decorator(f):
        from functools import wraps
        
        @wraps(f)
        def wrapper(*args, **kwargs):
            # Monitor the request
            security_result = security_monitor.monitor_request(request)
            
            # Block high-risk requests
            if security_result['risk_score'] > 80:
                logger.error(
                    "high_risk_request_blocked",
                    ip=request.remote_addr,
                    risk_score=security_result['risk_score'],
                    threats=len(security_result['threats'])
                )
                return jsonify({'error': 'Request blocked for security reasons'}), 403
            
            # Add security info to request context
            from flask import g
            g.security_info = security_result
            
            return f(*args, **kwargs)
        
        return wrapper
    return decorator