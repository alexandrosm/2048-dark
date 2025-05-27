# DNS Automation Scripts

Scalable, automated DNS management for Gandi domains using API v5.

## Setup

### 1. Get your Gandi Personal Access Token (PAT)

1. Log in to https://admin.gandi.net
2. Go to User Settings → Security → Personal Access Tokens
3. Create a new token with permissions:
   - "See and renew domain names"
   - "Manage domain name technical configurations"
4. Copy the token (shown only once!)

### 2. Set environment variable

```bash
export GANDI_PAT='your-token-here'

# Or add to your .bashrc/.zshrc for persistence
echo "export GANDI_PAT='your-token-here'" >> ~/.bashrc
```

### 3. Install dependencies

```bash
pip install requests
```

## Usage

### Quick setup for single domain

```bash
cd scripts
chmod +x dns-setup.sh

# Setup dark2048.com for GitHub Pages
./dns-setup.sh setup dark2048.com

# Verify DNS propagation
./dns-setup.sh verify dark2048.com
```

### Python API for automation

```python
from gandi_dns import GandiDNS

# Initialize with PAT
gandi = GandiDNS()  # Uses GANDI_PAT env var

# Setup GitHub Pages for a domain
gandi.setup_github_pages("dark2048.com")

# List all domains
domains = gandi.list_domains()
for domain in domains:
    print(domain['fqdn'])

# Get DNS records
records = gandi.get_dns_records("dark2048.com")
```

### Bulk operations

```bash
# Setup multiple domains at once
./dns-setup.sh setup-all dark2048.com another-domain.com third-domain.com

# Or programmatically
python3 -c "
from gandi_dns import GandiDNS
g = GandiDNS()
for domain in ['dark2048.com', 'example.com']:
    g.setup_github_pages(domain)
"
```

## GitHub Actions Integration

Add your PAT as a GitHub secret:

1. Go to your repo Settings → Secrets and variables → Actions
2. Add new secret: `GANDI_PAT` with your token value
3. The workflow will automatically check DNS health every 6 hours

## Features

- ✅ Automated GitHub Pages setup
- ✅ Bulk domain operations  
- ✅ DNS propagation verification
- ✅ GitHub Actions integration
- ✅ Reusable Python API
- ✅ Environment-based configuration
- ✅ Error handling and retries

## Advanced Usage

### Custom DNS records

```python
gandi = GandiDNS()

# Add custom A record
gandi.create_dns_record("dark2048.com", "A", "api", ["1.2.3.4"])

# Add MX records
gandi.create_dns_record("dark2048.com", "MX", "@", ["10 mail.example.com."])

# Update existing record
gandi.update_dns_record("dark2048.com", "TXT", "@", ["v=spf1 include:_spf.google.com ~all"])
```

### Integration with deployment

```yaml
# In your CI/CD pipeline
- name: Deploy to new domain
  run: |
    # Register new domain via API (if Gandi supports it)
    # Setup DNS automatically
    python scripts/gandi_dns.py setup-github $NEW_DOMAIN
    # Deploy application
    # ...
```

## Troubleshooting

- **403 Forbidden**: Check your PAT permissions
- **Domain not found**: Ensure domain is in your Gandi account
- **DNS not propagating**: Wait 10-60 minutes, check with `dig` or `nslookup`

## Security

- Never commit your PAT to git
- Use environment variables or secrets management
- Rotate tokens regularly
- Limit token permissions to minimum required