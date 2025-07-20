#!/bin/bash
set -euo pipefail  # Exit on error, undefined vars, and pipeline failures
IFS=$'\n\t'       # Stricter word splitting

# Wait for DNS to become available
echo "Waiting for DNS to become available..."
for i in {1..30}; do
    if nslookup google.com >/dev/null 2>&1; then
        echo "DNS is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "ERROR: DNS not available after 30 seconds"
        exit 1
    fi
    echo "DNS not ready, waiting... (attempt $i/30)"
    sleep 1
done

# Load environment variables from .env file if it exists
ENV_FILE="/projects/.devcontainer/.env"
if [ -f "$ENV_FILE" ]; then
    echo "Loading configuration from $ENV_FILE"
    set -a  # automatically export all variables
    source "$ENV_FILE"
    set +a
else
    echo "No .env file found at $ENV_FILE, using default domains"
    # Default domains if no .env file exists
    ALLOWED_DOMAINS="registry.npmjs.org api.anthropic.com sentry.io statsig.anthropic.com statsig.com"
    CUSTOM_DOMAINS=""
fi

# Flush existing rules and delete existing ipsets
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X
ipset destroy allowed-domains 2>/dev/null || true

# First allow DNS and localhost before any restrictions
# Allow outbound DNS
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
# Allow inbound DNS responses
iptables -A INPUT -p udp --sport 53 -j ACCEPT
# Allow outbound SSH
iptables -A OUTPUT -p tcp --dport 22 -j ACCEPT
# Allow inbound SSH responses
iptables -A INPUT -p tcp --sport 22 -m state --state ESTABLISHED -j ACCEPT
# Allow localhost
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Create ipset with CIDR support
ipset create allowed-domains hash:net

# Fetch GitHub meta information and aggregate + add their IP ranges
echo "Fetching GitHub IP ranges..."
gh_ranges=$(curl -s --connect-timeout 10 --max-time 30 https://api.github.com/meta 2>/dev/null || true)
if [ -z "$gh_ranges" ]; then
    echo "WARNING: Failed to fetch GitHub IP ranges, continuing with domain resolution only..."
    gh_ranges=""
fi

if [ -n "$gh_ranges" ] && ! echo "$gh_ranges" | jq -e '.web and .api and .git' >/dev/null 2>&1; then
    echo "WARNING: GitHub API response missing required fields, skipping GitHub IP ranges..."
    gh_ranges=""
fi

if [ -n "$gh_ranges" ]; then
    echo "Processing GitHub IPs..."
    while read -r cidr; do
        # Skip empty lines
        if [ -z "$cidr" ]; then
            continue
        fi
        # Skip IPv6 ranges since our ipset only handles IPv4
        if [[ "$cidr" =~ : ]]; then
            echo "Skipping IPv6 range: $cidr"
            continue
        fi
        if [[ ! "$cidr" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/[0-9]{1,2}$ ]]; then
            echo "ERROR: Invalid CIDR range from GitHub meta: $cidr"
            exit 1
        fi
        echo "Adding GitHub range $cidr"
        ipset add allowed-domains "$cidr"
    done < <(echo "$gh_ranges" | jq -r '(.web + .api + .git)[]' | sort -u)
else
    echo "Skipping GitHub IP processing (no data available)"
fi

# Resolve and add allowed domains from environment variables
# Combine ALLOWED_DOMAINS and CUSTOM_DOMAINS
ALL_DOMAINS="$ALLOWED_DOMAINS"
if [ -n "${CUSTOM_DOMAINS:-}" ]; then
    ALL_DOMAINS="$ALL_DOMAINS $CUSTOM_DOMAINS"
fi

# Convert space-separated domains to array for proper iteration
# Use eval to properly expand the domain list
eval "DOMAIN_LIST=($ALL_DOMAINS)"
for domain in "${DOMAIN_LIST[@]}"; do
    echo "Resolving $domain..."
    # Try multiple times with different nameservers
    ips=""
    for attempt in 1 2 3; do
        ips=$(dig +short A "$domain" 2>/dev/null || true)
        if [ -n "$ips" ]; then
            break
        fi
        echo "Attempt $attempt failed for $domain, retrying..."
        sleep 1
    done
    
    if [ -z "$ips" ]; then
        echo "WARNING: Failed to resolve $domain after 3 attempts, skipping..."
        continue
    fi
    
    while read -r ip; do
        if [[ ! "$ip" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
            echo "WARNING: Invalid IP from DNS for $domain: $ip, skipping..."
            continue
        fi
        echo "Adding $ip for $domain"
        ipset add allowed-domains "$ip"
    done < <(echo "$ips")
done

# Get host IP from default route
HOST_IP=$(ip route | grep default | cut -d" " -f3)
if [ -z "$HOST_IP" ]; then
    echo "ERROR: Failed to detect host IP"
    exit 1
fi

HOST_NETWORK=$(echo "$HOST_IP" | sed "s/\.[0-9]*$/.0\/24/")
echo "Host network detected as: $HOST_NETWORK"

# Set up remaining iptables rules
iptables -A INPUT -s "$HOST_NETWORK" -j ACCEPT
iptables -A OUTPUT -d "$HOST_NETWORK" -j ACCEPT

# Set default policies to DROP (the DNS rules above will remain active)
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP

# Allow established connections for already approved traffic
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow only specific outbound traffic to allowed domains
iptables -A OUTPUT -m set --match-set allowed-domains dst -j ACCEPT

echo "Firewall configuration complete"
echo "Verifying firewall rules..."
if curl --connect-timeout 5 https://example.com >/dev/null 2>&1; then
    echo "ERROR: Firewall verification failed - was able to reach https://example.com"
    exit 1
else
    echo "Firewall verification passed - unable to reach https://example.com as expected"
fi

# Verify GitHub API access
echo "Testing GitHub API access..."
if ! curl --connect-timeout 10 --max-time 30 https://api.github.com/zen >/dev/null 2>&1; then
    echo "WARNING: Unable to reach https://api.github.com - this might be expected in some environments"
    echo "Firewall configuration completed, but GitHub access verification failed"
else
    echo "Firewall verification passed - able to reach https://api.github.com as expected"
fi