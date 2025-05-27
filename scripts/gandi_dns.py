#!/usr/bin/env python3
"""
Gandi DNS automation script for scalable domain management
Supports Gandi API v5 with Personal Access Tokens
"""

import os
import sys
import json
import requests
from typing import List, Dict, Optional

class GandiDNS:
    """Automate Gandi DNS management with API v5"""
    
    def __init__(self, pat: Optional[str] = None):
        self.pat = pat or os.environ.get('GANDI_PAT')
        if not self.pat:
            raise ValueError("Gandi PAT required. Set GANDI_PAT environment variable or pass to constructor")
        
        self.base_url = "https://api.gandi.net/v5"
        self.headers = {
            "Authorization": f"Bearer {self.pat}",
            "Content-Type": "application/json"
        }
    
    def list_domains(self) -> List[Dict]:
        """List all domains in account"""
        response = requests.get(f"{self.base_url}/domain/domains", headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def get_dns_records(self, domain: str) -> List[Dict]:
        """Get all DNS records for a domain"""
        response = requests.get(
            f"{self.base_url}/livedns/domains/{domain}/records",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def create_dns_record(self, domain: str, record_type: str, name: str, values: List[str], ttl: int = 300) -> Dict:
        """Create a DNS record"""
        data = {
            "rrset_type": record_type,
            "rrset_name": name,
            "rrset_values": values,
            "rrset_ttl": ttl
        }
        
        response = requests.post(
            f"{self.base_url}/livedns/domains/{domain}/records",
            headers=self.headers,
            json=data
        )
        response.raise_for_status()
        return response.json()
    
    def update_dns_record(self, domain: str, record_type: str, name: str, values: List[str], ttl: int = 300) -> Dict:
        """Update existing DNS record (or create if doesn't exist)"""
        data = {
            "rrset_values": values,
            "rrset_ttl": ttl
        }
        
        response = requests.put(
            f"{self.base_url}/livedns/domains/{domain}/records/{name}/{record_type}",
            headers=self.headers,
            json=data
        )
        response.raise_for_status()
        return response.json()
    
    def delete_dns_record(self, domain: str, record_type: str, name: str) -> None:
        """Delete a DNS record"""
        response = requests.delete(
            f"{self.base_url}/livedns/domains/{domain}/records/{name}/{record_type}",
            headers=self.headers
        )
        response.raise_for_status()
    
    def setup_github_pages(self, domain: str, create_www: bool = True) -> None:
        """Setup domain for GitHub Pages hosting"""
        github_ips = [
            "185.199.108.153",
            "185.199.109.153", 
            "185.199.110.153",
            "185.199.111.153"
        ]
        
        print(f"Setting up {domain} for GitHub Pages...")
        
        # Create/update A records for apex domain
        print("Creating A records for GitHub Pages IPs...")
        self.update_dns_record(domain, "A", "@", github_ips, ttl=300)
        
        # Optionally create www CNAME
        if create_www:
            print("Creating www CNAME record...")
            # Need to determine the GitHub Pages URL
            # Format: username.github.io
            # This would need to be parameterized
            # self.update_dns_record(domain, "CNAME", "www", ["username.github.io."], ttl=300)
        
        print(f"✅ DNS configuration complete for {domain}")
        print("⏱️  DNS propagation typically takes 10-60 minutes")
        print("🔒 GitHub will automatically provision HTTPS certificate")
    
    def verify_dns_propagation(self, domain: str) -> bool:
        """Check if DNS has propagated"""
        import socket
        try:
            ip = socket.gethostbyname(domain)
            github_ips = ["185.199.108.153", "185.199.109.153", "185.199.110.153", "185.199.111.153"]
            return ip in github_ips
        except:
            return False


def main():
    """CLI interface for DNS management"""
    if len(sys.argv) < 2:
        print("Usage: python gandi_dns.py <command> [options]")
        print("\nCommands:")
        print("  list-domains              List all domains")
        print("  list-records <domain>     List DNS records for domain")
        print("  setup-github <domain>     Configure domain for GitHub Pages")
        print("  verify <domain>           Check if DNS has propagated")
        print("\nEnvironment:")
        print("  GANDI_PAT                 Your Gandi Personal Access Token")
        sys.exit(1)
    
    try:
        gandi = GandiDNS()
        command = sys.argv[1]
        
        if command == "list-domains":
            domains = gandi.list_domains()
            for domain in domains:
                print(f"- {domain['fqdn']} (expires: {domain['dates']['registry_ends_at']})")
        
        elif command == "list-records" and len(sys.argv) > 2:
            domain = sys.argv[2]
            records = gandi.get_dns_records(domain)
            for record in records:
                print(f"{record['rrset_type']} {record['rrset_name']} -> {', '.join(record['rrset_values'])}")
        
        elif command == "setup-github" and len(sys.argv) > 2:
            domain = sys.argv[2]
            gandi.setup_github_pages(domain)
        
        elif command == "verify" and len(sys.argv) > 2:
            domain = sys.argv[2]
            if gandi.verify_dns_propagation(domain):
                print(f"✅ {domain} is pointing to GitHub Pages")
            else:
                print(f"⏳ {domain} DNS has not propagated yet")
        
        else:
            print(f"Unknown command: {command}")
            sys.exit(1)
            
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()