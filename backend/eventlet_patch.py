# Eventlet monkey patching for WebSocket support
import eventlet

# Apply monkey patching before any other imports
eventlet.monkey_patch()