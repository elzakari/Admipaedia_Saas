"""
Test script for AI Analytics endpoints
Run this to test the AI analytics functionality
"""

import requests
import json
from datetime import datetime

# Base URL for the API
BASE_URL = "http://localhost:5000/api/v1"

def test_ai_analytics_endpoints():
    """Test AI analytics endpoints"""
    
    print("🧠 Testing AI Analytics Endpoints")
    print("=" * 50)
    
    # Test endpoints without authentication first
    endpoints = [
        "/ai-analytics/model/status",
        "/ai-analytics/dashboard/ai-summary?role=admin",
        "/ai-analytics/insights/school-wide",
        "/ai-analytics/predictions/student/1",
        "/ai-analytics/risk-assessment/student/1"
    ]
    
    for endpoint in endpoints:
        try:
            print(f"\n📡 Testing: {endpoint}")
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Success: {json.dumps(data, indent=2)[:200]}...")
            elif response.status_code == 401:
                print("🔐 Authentication required")
            elif response.status_code == 404:
                print("❌ Endpoint not found")
            else:
                print(f"⚠️  Response: {response.text[:200]}...")
                
        except requests.exceptions.ConnectionError:
            print("❌ Connection failed - Is the backend server running?")
        except Exception as e:
            print(f"❌ Error: {str(e)}")
    
    print("\n" + "=" * 50)
    print("Test completed!")

if __name__ == "__main__":
    test_ai_analytics_endpoints()