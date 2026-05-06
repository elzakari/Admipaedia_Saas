import abc

class NotificationAdapter(abc.ABC):
    @abc.abstractmethod
    def send(self, recipient: str, message: str, **kwargs):
        """Send a notification."""
        pass

class SMSAdapter(NotificationAdapter):
    def send(self, recipient, message, **kwargs):
        # Integration with Twilio or Africa's Talking would go here
        print(f"[SMS] To: {recipient}, Body: {message}")
        return True

class EmailAdapter(NotificationAdapter):
    def send(self, recipient, message, **kwargs):
        subject = kwargs.get('subject', 'Notification from ADMIPAEDIA')
        # Integration with SendGrid or SMTP would go here
        print(f"[Email] To: {recipient}, Subject: {subject}, Body: {message}")
        return True

class PushAdapter(NotificationAdapter):
    def send(self, recipient, message, **kwargs):
        # Integration with FCM would go here
        print(f"[Push] To: {recipient}, Body: {message}")
        return True
