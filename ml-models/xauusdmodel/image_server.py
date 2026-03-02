#!/usr/bin/env python3
"""
Simple HTTPS Web Server to host XAUUSD images for LINE Bot
"""

import os
import ssl
import socket
from pathlib import Path
from http.server import HTTPServer, SimpleHTTPRequestHandler
import threading
import time

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent.parent
IMAGES_DIR = PROJECT_ROOT / 'backend' / 'data'
PORT = 8443  # HTTPS port

# Create self-signed SSL certificate
def create_self_signed_cert():
    cert_file = PROJECT_ROOT / 'server.crt'
    key_file = PROJECT_ROOT / 'server.key'
    
    if cert_file.exists() and key_file.exists():
        print(f"[OK] Using existing certificates")
        return str(cert_file), str(key_file)
    
    print(f"[*] Creating self-signed certificate...")
    os.system(f'openssl req -x509 -newkey rsa:2048 -keyout {key_file} -out {cert_file} -days 365 -nodes -subj "/CN=localhost"')
    print(f"[OK] Certificate created: {cert_file}")
    print(f"[OK] Key created: {key_file}")
    return str(cert_file), str(key_file)

# Custom request handler
class ImageHTTPRequestHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Handle image requests
        if self.path.startswith('/images/'):
            filename = self.path.split('/')[-1]
            filepath = None
            
            # Search in predictions and graphs directories
            for search_dir in [IMAGES_DIR / 'predictions', IMAGES_DIR / 'graphs']:
                potential_path = search_dir / filename
                if potential_path.exists():
                    filepath = potential_path
                    break
            
            if filepath and filepath.exists():
                try:
                    with open(filepath, 'rb') as f:
                        self.send_response(200)
                        self.send_header('Content-type', 'image/png')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(f.read())
                    print(f"[OK] Served: {filename}")
                    return
                except Exception as e:
                    print(f"[ERROR] {e}")
        
        # Health check
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'OK')
            return
        
        self.send_response(404)
        self.end_headers()
    
    def log_message(self, format, *args):
        # Suppress default logging
        pass

def get_local_ip():
    """Get local IP address"""
    try:
        # Connect to a remote host to determine local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

def start_server():
    """Start HTTPS server in background thread"""
    cert_file, key_file = create_self_signed_cert()
    
    server_address = ('0.0.0.0', PORT)
    httpd = HTTPServer(server_address, ImageHTTPRequestHandler)
    
    # Add SSL
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(cert_file, key_file)
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    
    local_ip = get_local_ip()
    print("\n" + "="*80)
    print("XAUUSD Image Server Started")
    print("="*80)
    print(f"Server: https://localhost:{PORT}")
    print(f"Local IP: https://{local_ip}:{PORT}")
    print(f"Health check: https://localhost:{PORT}/health")
    print(f"\nImage URLs:")
    print(f"  Prediction: https://{local_ip}:{PORT}/images/xauusd_prediction_YYYYMMDD.png")
    print(f"  Graph: https://{local_ip}:{PORT}/images/xauusd_graph_YYYYMMDD.png")
    print("="*80 + "\n")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Server stopped")
        httpd.shutdown()

if __name__ == "__main__":
    # Start server in background
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    
    # Keep process alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[*] Shutting down...")
