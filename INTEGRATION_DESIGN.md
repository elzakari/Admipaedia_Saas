# ADMIPAEDIA Integration Design

## 1. Overview
This document defines the adapter patterns for external service integrations, ensuring flexibility across different providers (e.g., switching between AWS S3 and MinIO, or Paystack and Stripe) without changing core application logic.

## 2. Notification Service Adapter (Email & SMS)

### 2.1 Interface Definition
```python
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class NotificationProvider(ABC):
    @abstractmethod
    def send(self, recipient: str, content: str, subject: Optional[str] = None, metadata: Optional[Dict] = None) -> bool:
        """Send a notification to a single recipient."""
        pass

    @abstractmethod
    def send_bulk(self, recipients: List[str], content: str, subject: Optional[str] = None) -> Dict[str, bool]:
        """Send a notification to multiple recipients."""
        pass
```

### 2.2 Implementations
*   **Email**:
    *   `SMTPEmailProvider`: Standard SMTP (Gmail, Outlook, etc.).
    *   `SendGridProvider`: API-based sending with templates.
    *   `SESProvider`: AWS Simple Email Service.
*   **SMS**:
    *   `AfricasTalkingProvider`: Primary for East/West Africa.
    *   `TwilioProvider`: Global backup.
    *   `HubtelProvider`: Ghana specific.
    *   `TermiiProvider`: Nigeria specific.

## 3. Payment Service Adapter

### 3.1 Interface Definition
```python
class PaymentGateway(ABC):
    @abstractmethod
    def initialize_transaction(self, amount: float, currency: str, email: str, reference: str, callback_url: str) -> Dict[str, Any]:
        """Initialize a payment and return the checkout URL/data."""
        pass

    @abstractmethod
    def verify_transaction(self, reference: str) -> Dict[str, Any]:
        """Verify the status of a transaction."""
        pass
    
    @abstractmethod
    def handle_webhook(self, payload: Dict[str, Any], signature: str) -> bool:
        """Process webhook events."""
        pass
```

### 3.2 Implementations
*   `PaystackGateway`: Primary for Nigeria/Ghana.
*   `FlutterwaveGateway`: Pan-African coverage (M-Pesa, Mobile Money).
*   `StripeGateway`: International payments.
*   `ManualGateway`: Cash/Bank Transfer recording.

## 4. Storage Service Adapter

### 4.1 Interface Definition
```python
class StorageProvider(ABC):
    @abstractmethod
    def upload_file(self, file_obj, destination_path: str, mime_type: str = None) -> str:
        """Upload a file and return its public URL or key."""
        pass

    @abstractmethod
    def delete_file(self, file_path: str) -> bool:
        """Delete a file."""
        pass
    
    @abstractmethod
    def get_signed_url(self, file_path: str, expires_in: int = 3600) -> str:
        """Get a temporary access URL."""
        pass
```

### 4.2 Implementations
*   `S3Provider`: AWS S3.
*   `LocalProvider`: Local filesystem (for development/on-prem).
*   `MinIOProvider`: Self-hosted S3 compatible.

## 5. AI Service Adapter

### 5.1 Interface Definition
```python
class AIModelProvider(ABC):
    @abstractmethod
    def predict_performance(self, student_data: Dict[str, Any]) -> Dict[str, float]:
        """Predict student performance based on historical data."""
        pass

    @abstractmethod
    def generate_content(self, prompt: str, context: Dict[str, Any]) -> str:
        """Generate text content (e.g., report card comments)."""
        pass
```

### 5.2 Implementations
*   `ScikitLearnProvider`: Internal ML models (Random Forest, Regression).
*   `OpenAIProvider`: External LLM for text generation.
*   `HuggingFaceProvider`: Open-source models.

## 6. Configuration Strategy
All adapters are instantiated via a Factory pattern based on environment variables or Tenant Configuration:

```python
def get_payment_gateway(tenant_config):
    gateway_type = tenant_config.get('PAYMENT_GATEWAY', 'paystack')
    if gateway_type == 'stripe':
        return StripeGateway(...)
    elif gateway_type == 'flutterwave':
        return FlutterwaveGateway(...)
    return PaystackGateway(...)
```
