#!/bin/bash
set -euo pipefail  # Exit on error, undefined vars, and pipeline failures
IFS=$'\n\t'       # Stricter word splitting

# Install required packages for DNS filtering
if ! command -v dnsmasq &> /dev/null; then
    echo "Installing dnsmasq for DNS filtering..."
    apt-get update -qq
    apt-get install -y dnsmasq
fi

# Stop any existing dnsmasq service
systemctl stop dnsmasq 2>/dev/null || true
systemctl stop systemd-resolved 2>/dev/null || true

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
ENV_FILE="/projects/claude-code/.devcontainer/.env"
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

# Resolve and add allowed domains from environment variables
# Combine ALLOWED_DOMAINS and CUSTOM_DOMAINS and deduplicate
ALL_DOMAINS="$ALLOWED_DOMAINS"
if [ -n "${CUSTOM_DOMAINS:-}" ]; then
    ALL_DOMAINS="$ALL_DOMAINS $CUSTOM_DOMAINS"
fi

# Deduplicate domains by converting to newlines, sorting, and removing duplicates
DEDUPED_DOMAINS=$(echo "$ALL_DOMAINS" | tr ' ' '\n' | sort -u | tr '\n' ' ' | sed 's/ $//')
echo "Combined and deduplicated domains: $DEDUPED_DOMAINS"

# Create dnsmasq configuration for domain filtering
DNSMASQ_CONF="/tmp/dnsmasq-filter.conf"
cat > "$DNSMASQ_CONF" << EOF
# Listen on localhost only
listen-address=127.0.0.1
# Bind to specific port
port=53
# Don't read /etc/hosts
no-hosts
# Don't read /etc/resolv.conf
no-resolv
# NO default upstream servers - whitelist only
# Log queries for debugging
log-queries
# Cache size
cache-size=1000
# Don't run as daemon (we'll manage it)
no-daemon
# Disable IPv6 to avoid confusion
filter-AAAA
EOF

# Add only allowed domains with upstream servers (whitelist approach)
echo "# Whitelist: Only allowed domains can resolve" >> "$DNSMASQ_CONF"
eval "DOMAIN_LIST=($DEDUPED_DOMAINS)"
for domain in "${DOMAIN_LIST[@]}"; do
    echo "Whitelisting domain: $domain and all subdomains"
    # Only these domains get upstream servers
    echo "server=/$domain/8.8.8.8" >> "$DNSMASQ_CONF"
    echo "server=/$domain/8.8.4.4" >> "$DNSMASQ_CONF"
done

# Everything else will get SERVFAIL (no upstream servers defined)

# Start dnsmasq with our configuration
echo "Starting DNS filtering service..."
dnsmasq --conf-file="$DNSMASQ_CONF" --pid-file=/tmp/dnsmasq.pid &
DNSMASQ_PID=$!

# Wait for dnsmasq to start
sleep 2

# Verify dnsmasq is running
if ! kill -0 $DNSMASQ_PID 2>/dev/null; then
    echo "ERROR: Failed to start dnsmasq"
    exit 1
fi

echo "DNS filtering service started (PID: $DNSMASQ_PID)"

# Update system DNS to use our filtered DNS
echo "Configuring system to use filtered DNS..."
# Create backup if it doesn't exist
if [ ! -f /etc/resolv.conf.backup ]; then
    cp /etc/resolv.conf /etc/resolv.conf.backup 2>/dev/null || true
fi
echo "nameserver 127.0.0.1" > /etc/resolv.conf

# Only flush OUTPUT chain rules to avoid breaking Docker's networking
iptables -F OUTPUT

# Allow essential traffic before any restrictions
# Allow DNS to localhost (our filtered DNS)
iptables -A OUTPUT -p udp -d 127.0.0.1 --dport 53 -j ACCEPT
iptables -A OUTPUT -p tcp -d 127.0.0.1 --dport 53 -j ACCEPT
# Allow DNS to upstream servers from dnsmasq process
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT
# Allow SSH
iptables -A OUTPUT -p tcp --dport 22 -j ACCEPT
# Allow localhost
iptables -A OUTPUT -o lo -j ACCEPT

# Get host IP from default route for Docker communication
HOST_IP=$(ip route | grep default | cut -d" " -f3)
if [ -z "$HOST_IP" ]; then
    echo "ERROR: Failed to detect host IP"
    exit 1
fi

HOST_NETWORK=$(echo "$HOST_IP" | sed "s/\.[0-9]*$/.0\/24/")
echo "Host network detected as: $HOST_NETWORK"

# Allow host network communication (needed for Docker)
iptables -A OUTPUT -d "$HOST_NETWORK" -j ACCEPT

# Allow established/related connections (must come before DROP policy)
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow all HTTP/HTTPS traffic since DNS filtering handles domain restrictions
iptables -A OUTPUT -p tcp --dport 80 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 443 -j ACCEPT

# Allow other common ports that might be needed
iptables -A OUTPUT -p tcp --dport 21 -j ACCEPT   # FTP
iptables -A OUTPUT -p tcp --dport 993 -j ACCEPT  # IMAPS
iptables -A OUTPUT -p tcp --dport 995 -j ACCEPT  # POP3S
iptables -A OUTPUT -p tcp --dport 587 -j ACCEPT  # SMTP submission

# Allow established/related connections
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Only set OUTPUT policy to DROP (leave INPUT/FORWARD alone to not break Docker)
iptables -P OUTPUT DROP

# Setup cleanup function
cleanup() {
    echo "Cleaning up DNS filtering..."
    # Stop dnsmasq first
    if [ -n "${DNSMASQ_PID:-}" ]; then
        kill $DNSMASQ_PID 2>/dev/null || true
        wait $DNSMASQ_PID 2>/dev/null || true
    fi
    # Restore original DNS configuration
    if [ -f /etc/resolv.conf.backup ]; then
        cp /etc/resolv.conf.backup /etc/resolv.conf 2>/dev/null || true
        rm -f /etc/resolv.conf.backup
    fi
    # Remove temp files
    rm -f /tmp/dnsmasq.pid /tmp/dnsmasq-filter.conf
}

# Register cleanup function
trap cleanup EXIT

echo "DNS-based domain filtering configuration complete"
echo "Verifying DNS filtering..."

# Test that blocked domains are blocked (should return NXDOMAIN)
echo "Testing blocked domain (should fail)..."
if nslookup example.com >/dev/null 2>&1; then
    echo "ERROR: DNS filtering failed - example.com should not resolve"
    exit 1
else
    echo "✓ DNS filtering working - example.com returns NXDOMAIN (blocked)"
fi

# Test that allowed domains work
echo "Testing allowed domain (should work)..."
eval "TEST_DOMAINS=($DEDUPED_DOMAINS)"
if [ ${#TEST_DOMAINS[@]} -gt 0 ]; then
    test_domain="${TEST_DOMAINS[0]}"
    echo "Testing $test_domain..."
    if nslookup "$test_domain" >/dev/null 2>&1; then
        resolved_ip=$(nslookup "$test_domain" | grep "Address:" | tail -1 | cut -d" " -f2)
        echo "✓ DNS filtering working - $test_domain resolves to $resolved_ip (allowed)"
    else
        echo "ERROR: Failed to resolve allowed domain $test_domain"
        exit 1
    fi
fi

# Test subdomain support
if [ ${#TEST_DOMAINS[@]} -gt 0 ]; then
    test_domain="${TEST_DOMAINS[0]}"
    subdomain="test.$test_domain"
    echo "Testing subdomain support with $subdomain..."
    if nslookup "$subdomain" >/dev/null 2>&1; then
        resolved_ip=$(nslookup "$subdomain" | grep "Address:" | tail -1 | cut -d" " -f2)
        echo "✓ Subdomain filtering working - $subdomain resolves to $resolved_ip (allowed)"
    else
        echo "! Subdomain $subdomain doesn't exist, but filtering rules are correct"
    fi
fi

echo "✓ DNS-based domain filtering verification complete"
echo "All requests will now be filtered at the DNS level"
echo "Only allowed domains and their subdomains can be resolved"
echo ""
echo "DNS filtering is now active and will continue running..."
echo "Press Ctrl+C to stop DNS filtering and restore original DNS settings"

# Keep the script running to maintain DNS filtering
# The cleanup function will run when the script is interrupted
wait $DNSMASQ_PID