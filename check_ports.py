#!/usr/bin/env python3
"""
Check which ports the frontend is running on
"""

import requests

def check_port(port):
    """Check if a port is responding"""
    try:
        response = requests.get(f'http://localhost:{port}', timeout=3)
        return response.status_code == 200
    except:
        return False

def main():
    ports_to_check = [3000, 3001, 3002, 3003]
    
    print("Checking frontend ports...")
    print("=" * 30)
    
    for port in ports_to_check:
        if check_port(port):
            print(f"✅ Port {port}: Frontend is running")
            print(f"🌐 Access at: http://localhost:{port}")
        else:
            print(f"❌ Port {port}: Not responding")
    
    print("\n" + "=" * 30)
    print("If you see a ✅ above, your website is working!")

if __name__ == "__main__":
    main()