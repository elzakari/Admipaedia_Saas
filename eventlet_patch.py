# eventlet_patch.py

import ssl
import warnings
import eventlet

# Apply eventlet monkey patching immediately
eventlet.monkey_patch()

# Check if wrap_socket is missing (Python 3.12+)
if not hasattr(ssl, 'wrap_socket'):
    def wrap_socket(sock, keyfile=None, certfile=None,
                   server_side=False, cert_reqs=ssl.CERT_NONE,
                   ssl_version=ssl.PROTOCOL_TLS, ca_certs=None,
                   do_handshake_on_connect=True,
                   suppress_ragged_eofs=True,
                   ciphers=None):
        warnings.warn(
            "ssl.wrap_socket() is deprecated and will be removed in Python 3.12. "
            "Use ssl.SSLContext.wrap_socket() instead.",
            DeprecationWarning, stacklevel=2
        )
        context = ssl.SSLContext(ssl_version)
        context.verify_mode = cert_reqs
        if ca_certs:
            context.load_verify_locations(ca_certs)
        if certfile:
            context.load_cert_chain(certfile, keyfile)
        if ciphers:
            context.set_ciphers(ciphers)
        return context.wrap_socket(
            sock,
            server_side=server_side,
            do_handshake_on_connect=do_handshake_on_connect,
            suppress_ragged_eofs=suppress_ragged_eofs
        )
    
    # Add the function to the ssl module
    ssl.wrap_socket = wrap_socket


def apply_patch():
    """Dummy function for explicit patch control"""
    pass